export function AuthDivider() {
  return (
    <div className="relative my-8">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-gray-50 px-4 font-medium text-gray-700 uppercase">or</span>
      </div>
    </div>
  );
}
