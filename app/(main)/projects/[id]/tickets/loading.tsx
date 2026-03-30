export default function Loading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        {/* Header skeleton */}
        <div className="mb-6">
          <div className="h-10 bg-gray-200 rounded w-32 mb-4"></div>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          
          {/* Stats cards skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="h-32 bg-gray-200 rounded mb-6"></div>

        {/* Tickets list skeleton */}
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
