interface AuthErrorProps {
  error: string;
}

export function AuthError({ error }: AuthErrorProps) {
  return <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>;
}
