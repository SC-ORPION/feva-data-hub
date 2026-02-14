import Link from 'next/link';

export default function ResellerSection() {
  return (
    <section className="py-16 bg-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Start Your Own Data Business Today</h2>
          <ul className="space-y-4 mb-8">
            <li className="flex items-start gap-4">
              <div className="w-2 h-2 bg-green-500 mt-2 rounded-full flex-shrink-0" />
              <span className="text-gray-700">Set your own prices</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-2 h-2 bg-green-500 mt-2 rounded-full flex-shrink-0" />
              <span className="text-gray-700">Keep your profits</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-2 h-2 bg-green-500 mt-2 rounded-full flex-shrink-0" />
              <span className="text-gray-700">Withdraw anytime</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-2 h-2 bg-green-500 mt-2 rounded-full flex-shrink-0" />
              <span className="text-gray-700">No experience needed</span>
            </li>
          </ul>
          <Link
            href="/auth/signup"
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition inline-block"
          >
            Join Now
          </Link>
        </div>
      </div>
    </section>
  );
}
