import { Check } from "lucide-react";

export function WorksWith() {
  return (
    <div className="flex flex-col flex-wrap items-start gap-4 md:flex-row md:items-center">
      {/* Vendor logos */}
      <a href="https://www.withings.com/health-mate" className="order-2 w-full text-black hover:no-underline md:w-auto md:pr-6">
        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-1 hover:bg-gray-100">
          <div className="flex flex-col items-center">
            <img src="/withings-app.png" alt="Withings app logo" className="h-35 w-32 object-contain" />
            <div className="flex flex-col items-center leading-none">
              <span className="text-brand-500 font-bold">Works with</span>
              <div className="text-3xl font-medium tracking-wider">WITHINGS</div>
            </div>
          </div>
        </div>
      </a>
      <a href="https://www.fitbit.com/sg/app" className="order-2 w-full text-black hover:no-underline md:w-auto md:pr-6">
        <div className="flex h-56 w-56 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 p-1 hover:bg-gray-100">
          <div className="flex flex-col items-center">
            <img src="/fitbit-app.png" alt="Fitbit app logo" className="h-35 w-32 object-contain" />
            <div className="flex flex-col items-center leading-none">
              <span className="text-brand-500 font-bold">Works with</span>
              <div className="text-4xl font-normal">fitbit</div>
            </div>
          </div>
        </div>
      </a>

      {/* Text content */}
      <div className="order-1 pb-6 text-xl md:order-3 md:pt-6">
        <div className="font-bold">Enter your daily weight how you like...</div>
        <div>
          <Check className="mr-1 inline-block h-5 w-5 text-green-500" /> Smart Scales / WiFi Scales
        </div>
        <div>
          <Check className="mr-1 inline-block h-5 w-5 text-green-500" /> Withings Health Mate App
        </div>
        <div>
          <Check className="mr-1 inline-block h-5 w-5 text-green-500" /> Fitbit App
        </div>
      </div>
    </div>
  );
}
