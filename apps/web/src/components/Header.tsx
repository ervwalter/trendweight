import { Link } from "@tanstack/react-router";
import { Logo } from "./Logo";
import { Container } from "./Container";
import { useAuth } from "../lib/auth/useAuth";
import { useState, useRef, useEffect } from "react";
import { HiMenu, HiX } from "react-icons/hi";

export function Header() {
  const { isInitializing, isLoggedIn, signOut } = useAuth();
  const visibility = isInitializing ? "invisible" : "visible";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileMenuOpen]);

  return (
    <header className="bg-brand-500 text-white print:hidden">
      <Container>
        <nav className="flex items-stretch justify-between">
          <div className="flex items-center gap-2 py-3">
            <Link to={isLoggedIn ? "/dashboard" : "/"} className="font-logo text-3xl leading-tight font-bold">
              TrendWeight
            </Link>
            <Logo className="h-8 w-auto" />
          </div>
          <div className="hidden items-stretch md:flex md:pr-8">
            <NavLink to="/" visibility={visibility}>
              Home
            </NavLink>
            {isLoggedIn && (
              <>
                <NavLink to="/dashboard" visibility={visibility}>
                  Dashboard
                </NavLink>
                <NavLink to="/settings" visibility={visibility}>
                  Settings
                </NavLink>
              </>
            )}
            <NavLink to="/about" visibility={visibility}>
              Learn
            </NavLink>
            {!isLoggedIn ? (
              <NavLink to="/login" visibility={visibility}>
                Log In
              </NavLink>
            ) : (
              <button className={`hover:text-brand-800 flex items-center px-3 transition-colors hover:bg-white ${visibility}`} onClick={() => signOut()}>
                Log Out
              </button>
            )}
          </div>
          <button
            ref={buttonRef}
            className="flex items-center p-2 text-white md:hidden"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
          </button>
        </nav>
        {/* Mobile menu */}
        <div ref={menuRef} className={`md:hidden ${mobileMenuOpen ? "block" : "hidden"} bg-brand-400 -mx-4 px-4 py-4`}>
          <div className="flex flex-col space-y-3">
            <MobileNavLink to="/" onClick={() => setMobileMenuOpen(false)} visibility={visibility}>
              Home
            </MobileNavLink>
            {isLoggedIn && (
              <>
                <MobileNavLink to="/dashboard" onClick={() => setMobileMenuOpen(false)} visibility={visibility}>
                  Dashboard
                </MobileNavLink>
                <MobileNavLink to="/settings" onClick={() => setMobileMenuOpen(false)} visibility={visibility}>
                  Settings
                </MobileNavLink>
              </>
            )}
            <MobileNavLink to="/about" onClick={() => setMobileMenuOpen(false)} visibility={visibility}>
              Learn
            </MobileNavLink>
            {!isLoggedIn ? (
              <MobileNavLink to="/login" onClick={() => setMobileMenuOpen(false)} visibility={visibility}>
                Log In
              </MobileNavLink>
            ) : (
              <button
                className={`hover:bg-brand-300 block w-full rounded px-3 py-2 text-left text-white ${visibility}`}
                onClick={async (e) => {
                  e.preventDefault();
                  await signOut();
                  setMobileMenuOpen(false);
                }}
                onTouchEnd={async (e) => {
                  e.preventDefault();
                  await signOut();
                  setMobileMenuOpen(false);
                }}
              >
                Log Out
              </button>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

interface NavLinkProps {
  to: string;
  children: React.ReactNode;
  visibility?: string;
}

function NavLink({ to, children, visibility = "visible" }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`hover:text-brand-800 flex items-center px-3 transition-colors hover:bg-white ${visibility}`}
      activeProps={{
        className: "bg-brand-400",
      }}
    >
      {children}
    </Link>
  );
}

interface MobileNavLinkProps extends NavLinkProps {
  onClick: () => void;
}

function MobileNavLink({ to, children, onClick, visibility = "visible" }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      className={`hover:bg-brand-300 rounded px-3 py-2 text-white ${visibility}`}
      activeProps={{
        className: "bg-brand-300",
      }}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
