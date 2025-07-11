const DashboardPlaceholder = () => {
  return (
    <div className="animate-pulse">
      {/* Buttons placeholder */}
      <div className="flex flex-col-reverse md:flex-row gap-4 mb-4">
        <div className="h-10 bg-gray-200 rounded-md w-64"></div>
        <div className="h-10 bg-gray-200 rounded-md w-64"></div>
      </div>

      {/* Chart and Currently section */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-12 mb-4">
        <div className="w-full md:w-[475px] lg:w-[650px] xl:w-[840px] h-96 bg-gray-200 rounded"></div>
        <div className="flex flex-col gap-2">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-12 bg-gray-200 rounded w-48"></div>
          <div className="h-8 bg-gray-200 rounded w-40"></div>
          <div className="h-4 bg-gray-200 rounded w-36"></div>
        </div>
      </div>

      {/* Recent Readings and Stats section */}
      <div className="flex flex-col-reverse md:flex-row gap-4 md:gap-12 lg:gap-20">
        <div className="w-full md:w-auto">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          {/* Table skeleton matching md:min-w-[280px] */}
          <div className="w-full md:w-[280px] space-y-2">
            {/* Table header */}
            <div className="flex gap-4 pb-2">
              <div className="h-5 bg-gray-200 rounded w-16"></div>
              <div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
            {/* Table rows */}
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-5 bg-gray-200 rounded w-16 ml-auto"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          {/* Deltas section */}
          <div>
            <div className="h-6 bg-gray-200 rounded w-48 mb-3"></div>
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-5 bg-gray-200 rounded w-64"></div>
              ))}
            </div>
          </div>
          {/* Stats section */}
          <div>
            <div className="h-6 bg-gray-200 rounded w-52 mb-3"></div>
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-80"></div>
              <div className="h-5 bg-gray-200 rounded w-72 mt-4"></div>
              <div className="h-5 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPlaceholder;
