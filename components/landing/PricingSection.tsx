import Link from 'next/link';

const packages = [
  { size: '1GB', price: 'GHS 2.50' },
  { size: '2GB', price: 'GHS 4.50' },
  { size: '5GB', price: 'GHS 10.00' },
  { size: '10GB', price: 'GHS 18.00' },
];

export default function PricingSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Sample Pricing</h2>
        </div>
        <div className="bg-gray-50 rounded-lg overflow-hidden shadow">
          <table className="w-full">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Data Size</th>
                <th className="px-6 py-4 text-left font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((pkg, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 text-gray-900">{pkg.size}</td>
                  <td className="px-6 py-4 text-gray-900 font-semibold">{pkg.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-center mt-8">
          <Link
            href="/dashboard"
            className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition inline-block"
          >
            View Full Price List
          </Link>
        </div>
      </div>
    </section>
  );
}
