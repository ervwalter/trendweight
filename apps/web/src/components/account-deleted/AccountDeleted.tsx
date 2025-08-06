import { Link } from "@tanstack/react-router";
import { Heading } from "../ui/Heading";
import { Button } from "../ui/button";

export function AccountDeleted() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="text-center">
        <div className="mb-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <Heading level={1} className="text-green-600">
            Account Successfully Deleted
          </Heading>
        </div>

        <div className="mb-8 space-y-4 text-gray-600">
          <p>Your TrendWeight account has been permanently deleted, including:</p>
          <ul className="mx-auto max-w-md space-y-2 text-left">
            <li className="flex items-center">
              <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Your account and all settings
            </li>
            <li className="flex items-center">
              <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              All your weight measurement data
            </li>
            <li className="flex items-center">
              <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Your connections to Withings and Fitbit
            </li>
          </ul>
          <p className="text-sm">If you decide to recreate your account in the future, you'll need to reconnect your scale to re-download any weight data.</p>
        </div>

        <div className="space-y-4">
          <Button asChild variant="default">
            <Link to="/">Return to Home</Link>
          </Button>
          <p className="text-sm text-gray-500">Thank you for using TrendWeight!</p>
        </div>
      </div>
    </div>
  );
}
