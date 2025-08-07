export function AuthDivider() {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center">
        <div className="border-border w-full border-t"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-muted text-foreground/80 px-4 font-medium uppercase">or</span>
      </div>
    </div>
  );
}
