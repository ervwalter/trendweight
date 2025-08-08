interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <svg className={className} viewBox="0 0 458 190" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="m16.181,85.794l41.679,-31.284l37.511,31.284l25.007,-18.77l20.839,12.513l35.427,-22.937l52.1,37.541l18.756,-77.172l29.175,77.168l33.343,-14.6l35.427,58.4l37.511,6.257l25.008,-18.77l33.343,47.968"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
