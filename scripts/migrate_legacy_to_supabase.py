#!/usr/bin/env python3
"""
Script to migrate legacy TrendWeight data from MSSQL to Supabase legacy_profiles table.

This script:
1. Connects to legacy MSSQL database
2. Pulls all profile and measurement data
3. Converts data to the format expected by the current migration system
4. Stores in Supabase legacy_profiles table for future use

Key conversions performed:
- Weight units: Convert lbs to kg for non-metric users
- PlannedPoundsPerWeek: Divide by 2 for metric users (matching LegacyMigrationService logic)
- DateTime format: Convert to local date/time strings (yyyy-MM-dd and HH:mm:ss)
- FatRatio: Keep as decimal ratio (not percentage)
"""

import os
import json
import pyodbc
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from supabase import create_client
from supabase.client import Client

# Load environment variables
load_dotenv()

# Constants matching LegacyMigrationService
POUNDS_TO_KG = 0.453592

# Simple email validation regex
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

class LegacyProfile:
    """Legacy profile data from MSSQL"""
    def __init__(self, row):
        self.user_id = row.UserId
        self.username = row.UserName or ""
        self.email = row.Email
        self.first_name = row.FirstName or ""
        self.use_metric = bool(row.UseMetric)
        self.start_date = row.StartDate
        self.goal_weight = float(row.GoalWeight) if row.GoalWeight else 0.0
        self.planned_pounds_per_week = float(row.PlannedPoundsPerWeek) if row.PlannedPoundsPerWeek else 0.0
        self.day_start_offset = int(row.DayStartOffset) if row.DayStartOffset else 0
        self.private_url_key = row.PrivateUrlKey or ""
        self.device_type = row.DeviceType
        self.fitbit_refresh_token = row.FitbitRefreshToken

class LegacyMeasurement:
    """Legacy measurement data from MSSQL"""
    def __init__(self, row):
        self.user_id = row.UserId
        self.timestamp = row.Timestamp
        self.weight = float(row.Weight)
        self.fat_ratio = float(row.FatRatio) if row.FatRatio else None

def get_mssql_connection():
    """Create MSSQL connection using environment variables"""
    driver = os.getenv('MSSQL_DRIVER')
    host = os.getenv('MSSQL_HOST')
    database = os.getenv('MSSQL_DATABASE')
    user = os.getenv('MSSQL_USER')
    password = os.getenv('MSSQL_PASSWORD')
    encrypt = os.getenv('MSSQL_ENCRYPT', 'true').lower() == 'true'
    
    if not all([driver, host, database, user, password]):
        raise ValueError("Missing MSSQL environment variables. Required: MSSQL_DRIVER, MSSQL_HOST, MSSQL_DATABASE, MSSQL_USER, MSSQL_PASSWORD")
    
    conn_string = f"DRIVER={{{driver}}};SERVER={host};DATABASE={database};UID={user};PWD={password};Encrypt={'yes' if encrypt else 'no'};TrustServerCertificate=yes"
    return pyodbc.connect(conn_string)

def get_supabase_client() -> Client:
    """Create Supabase client using environment variables"""
    url = os.getenv('Supabase__Url')
    service_key = os.getenv('Supabase__ServiceKey')
    
    if not url or not service_key:
        raise ValueError("Missing Supabase environment variables. Required: Supabase__Url, Supabase__ServiceKey")
    
    return create_client(url, service_key)


def fetch_legacy_measurements(conn, user_id: str) -> List[LegacyMeasurement]:
    """Fetch all measurements for a specific user"""
    with conn.cursor() as cur:
        query = """
            SELECT 
                sm.UserId,
                sm.Timestamp,
                sm.Weight,
                sm.FatRatio
            FROM SourceMeasurements sm
            WHERE sm.UserId = ?
            ORDER BY sm.Timestamp
        """
        
        cur.execute(query, user_id)
        results = cur.fetchall()
        
        return [LegacyMeasurement(row) for row in results]

def is_valid_email(email: str) -> bool:
    """Check if email looks valid using simple regex"""
    if not email or len(email) > 254:  # RFC 5321 limit
        return False
    return EMAIL_REGEX.match(email) is not None

def convert_measurements_to_raw_format(measurements: List[LegacyMeasurement], use_metric: bool) -> List[Dict[str, Any]]:
    """Convert legacy measurements to RawMeasurement format"""
    raw_measurements = []
    
    for measurement in measurements:
        # Convert weight to kg if not metric
        weight_kg = measurement.weight
        if not use_metric:
            weight_kg = measurement.weight * POUNDS_TO_KG
        
        raw_measurement = {
            "Date": measurement.timestamp.strftime("%Y-%m-%d"),
            "Time": measurement.timestamp.strftime("%H:%M:%S"),
            "Weight": weight_kg,
            "FatRatio": measurement.fat_ratio
        }
        raw_measurements.append(raw_measurement)
    
    return raw_measurements

def convert_profile_for_storage(profile: LegacyProfile, measurements: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Convert legacy profile to format for legacy_profiles table"""
    
    # Handle goal weight: 0 means "not set" so convert to None
    goal_weight = profile.goal_weight if profile.goal_weight > 0 else None
    
    # Handle planned pounds per week: always in lbs in MSSQL, round to nearest 0.5 first
    planned_ppw = profile.planned_pounds_per_week
    if planned_ppw != 0:  # Don't round 0
        # Round to nearest 0.5 (multiply by 2, round, divide by 2)
        planned_ppw = round(planned_ppw * 2) / 2
    
    # Apply metric conversion if needed (after rounding)
    if profile.use_metric and planned_ppw != 0:
        planned_ppw = planned_ppw / 2
    
    return {
        'email': profile.email,
        'username': profile.username,
        'first_name': profile.first_name,
        'use_metric': profile.use_metric,
        'start_date': profile.start_date.strftime("%Y-%m-%d") if profile.start_date else None,
        'goal_weight': goal_weight,  # None if was 0
        'planned_pounds_per_week': planned_ppw,  # Rounded to 0.5, then converted if metric
        'day_start_offset': profile.day_start_offset,
        'private_url_key': profile.private_url_key,
        'device_type': profile.device_type,
        'refresh_token': profile.fitbit_refresh_token,
        'measurements': measurements,
        'created_at': datetime.utcnow().isoformat(),
        'updated_at': datetime.utcnow().isoformat()
    }

def clear_legacy_profiles_table(supabase: Client):
    """Clear existing data from legacy_profiles table (equivalent to TRUNCATE)"""
    try:
        # Delete all rows (Supabase doesn't expose TRUNCATE directly)
        # Using a condition that will match all rows
        result = supabase.table('legacy_profiles').delete().gte('created_at', '1970-01-01').execute()
        deleted_count = len(result.data) if result.data else 0
        print(f"Cleared legacy_profiles table ({deleted_count} rows deleted)")
    except Exception as e:
        print(f"Note: Could not clear existing data (table may be empty): {e}")

def insert_legacy_profiles(supabase: Client, profiles_data: List[Dict[str, Any]]):
    """Insert legacy profiles into Supabase"""
    if not profiles_data:
        print("No profiles to insert")
        return
    
    try:
        # Insert in batches of 100 to avoid request size limits
        batch_size = 100
        for i in range(0, len(profiles_data), batch_size):
            batch = profiles_data[i:i + batch_size]
            result = supabase.table('legacy_profiles').insert(batch).execute()
            print(f"Inserted batch {i//batch_size + 1}: {len(batch)} profiles")
        
        print(f"Successfully inserted {len(profiles_data)} legacy profiles")
    except Exception as e:
        print(f"Error inserting profiles: {e}")
        raise

def main():
    """Main migration function with batch processing"""
    
    # Configuration
    BATCH_SIZE = 100  # Process profiles in batches to avoid memory issues
    
    print("Starting legacy data migration from MSSQL to Supabase...")
    
    try:
        # Connect to databases
        print("Connecting to MSSQL...")
        mssql_conn = get_mssql_connection()
        
        print("Connecting to Supabase...")
        supabase = get_supabase_client()
        
        # Get total count first
        with mssql_conn.cursor() as cur:
            count_query = """
                SELECT COUNT(*)
                FROM TrendWeightProfiles p
                JOIN Memberships m ON p.UserId = m.UserId
                JOIN Users u ON m.UserId = u.UserId
                WHERE 
                    -- Recent activity filter
                    (p.FitbitLastSync >= '2020-01-01'
                     OR p.WithingsLastAccess >= 1577836800
                     OR m.LastLoginDate >= '2020-01-01')
                    -- Must have refresh token
                    AND p.FitbitRefreshToken IS NOT NULL 
                    AND p.FitbitRefreshToken != ''
            """
            cur.execute(count_query)
            total_profiles = cur.fetchone()[0]
            print(f"Found {total_profiles} active legacy profiles with refresh tokens to migrate")
        
        if total_profiles == 0:
            print("No legacy profiles found")
            return
        
        # Clear existing data once at the start
        print("Clearing existing legacy profiles data...")
        clear_legacy_profiles_table(supabase)
        
        # Process profiles in batches
        print(f"Processing profiles in batches of {BATCH_SIZE}...")
        
        processed_count = 0
        skipped_count = 0
        total_measurements = 0
        
        # Use OFFSET/FETCH for pagination through MSSQL data
        offset = 0
        
        while offset < total_profiles:
            print(f"Processing batch {offset//BATCH_SIZE + 1} (profiles {offset+1}-{min(offset+BATCH_SIZE, total_profiles)})")
            
            # Fetch batch of profiles
            with mssql_conn.cursor() as cur:
                batch_query = """
                    SELECT 
                        p.UserId,
                        u.UserName,
                        m.Email,
                        p.FirstName,
                        p.UseMetric,
                        p.StartDate,
                        p.GoalWeight,
                        p.PlannedPoundsPerWeek,
                        p.DayStartOffset,
                        p.PrivateUrlKey,
                        p.DeviceType,
                        p.FitbitRefreshToken
                    FROM TrendWeightProfiles p
                    JOIN Memberships m ON p.UserId = m.UserId
                    JOIN Users u ON m.UserId = u.UserId
                    WHERE 
                        -- Recent activity filter
                        (p.FitbitLastSync >= '2020-01-01'
                         OR p.WithingsLastAccess >= 1577836800
                         OR m.LastLoginDate >= '2020-01-01')
                        -- Must have refresh token
                        AND p.FitbitRefreshToken IS NOT NULL 
                        AND p.FitbitRefreshToken != ''
                    ORDER BY m.Email
                    OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
                """
                cur.execute(batch_query, offset, BATCH_SIZE)
                batch_results = cur.fetchall()
            
            if not batch_results:
                break
                
            # Process this batch
            batch_profiles_data = []
            
            for row in batch_results:
                profile = LegacyProfile(row)
                
                # Skip profiles with invalid emails
                if not is_valid_email(profile.email):
                    print(f"  Skipping invalid email: {profile.email}")
                    skipped_count += 1
                    continue
                
                # Fetch measurements for this profile
                measurements = fetch_legacy_measurements(mssql_conn, str(profile.user_id))
                
                # Convert measurements to raw format
                raw_measurements = convert_measurements_to_raw_format(measurements, profile.use_metric)
                
                # Convert profile for storage
                profile_data = convert_profile_for_storage(profile, raw_measurements)
                batch_profiles_data.append(profile_data)
                
                total_measurements += len(raw_measurements)
                processed_count += 1
            
            # Insert this batch
            if batch_profiles_data:
                insert_legacy_profiles(supabase, batch_profiles_data)
                print(f"  Inserted {len(batch_profiles_data)} profiles with {sum(len(p['measurements']) for p in batch_profiles_data)} total measurements")
            
            # Move to next batch
            offset += BATCH_SIZE
        
        # Summary
        print(f"\nMigration completed successfully!")
        print(f"- Profiles migrated: {processed_count}")
        print(f"- Profiles skipped (invalid email): {skipped_count}")
        print(f"- Total measurements: {total_measurements}")
        
        # Show some sample data for verification
        print(f"\nVerifying migration by checking first profile in Supabase...")
        try:
            sample_result = supabase.table('legacy_profiles').select('email,use_metric,measurements').limit(1).execute()
            if sample_result.data:
                sample = sample_result.data[0]
                measurements_count = len(sample.get('measurements', []))
                print(f"  Sample profile: {sample['email']}")
                print(f"  Use Metric: {sample['use_metric']}")
                print(f"  Measurements: {measurements_count}")
                if measurements_count > 0:
                    print(f"  First measurement: {sample['measurements'][0]}")
            else:
                print("  No data found in legacy_profiles table")
        except Exception as e:
            print(f"  Could not verify sample data: {e}")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        raise
    finally:
        if 'mssql_conn' in locals():
            mssql_conn.close()

if __name__ == '__main__':
    main()