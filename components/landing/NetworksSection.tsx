export default function NetworksSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Supported Networks Across Ghana
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {['MTN', 'Telecel', 'AirtelTigo'].map((network) => (
            <div key={network} className="flex flex-col items-center p-8 bg-gray-50 rounded-lg">
              <div className="w-20 h-20 bg-blue-200 rounded-full flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-blue-600">{network[0]}</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{network}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
