interface AuthErrorProps {
  error: string;
}

export function AuthError({ error }: AuthErrorProps) {
  return <div className="border-destructive/30 bg-destructive/10 text-destructive mb-4 rounded-md border p-3">{error}</div>;
}
