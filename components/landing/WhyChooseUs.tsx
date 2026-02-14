import { Zap, Percent, Users, Clock } from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Instant Delivery',
    description: 'Data delivered to your account in seconds.',
  },
  {
    icon: Percent,
    title: 'Affordable Prices',
    description: 'Best data prices in Ghana.',
  },
  {
    icon: Users,
    title: 'Reseller Opportunity',
    description: 'Start your own data business.',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Always available on WhatsApp.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose Us</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition">
                <Icon className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
