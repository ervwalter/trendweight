import { Link } from '@tanstack/react-router'

export function Banner() {
  return (
    <div className="bg-brand-500 text-white">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-logo text-5xl md:text-6xl font-bold leading-none">TrendWeight</h1>
          <svg
            className="h-8 md:h-12 w-auto"
            viewBox="0 0 458 190"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="m16.181,85.794l41.679,-31.284l37.511,31.284l25.007,-18.77l20.839,12.513l35.427,-22.937l52.1,37.541l18.756,-77.172l29.175,77.168l33.343,-14.6l35.427,58.4l37.511,6.257l25.008,-18.77l33.343,47.968" 
              stroke="currentColor" 
              strokeWidth="8" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <p className="text-xl">
          Automated Weight Tracking<span className="hidden md:inline">, Hacker's Diet Style</span>
        </p>
      </div>
    </div>
  )
}