export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4">FEVA Data Hub</h3>
            <p className="text-gray-400">Fast, reliable, and affordable mobile data for all networks.</p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Quick Links</h4>
            <ul className="text-gray-400 space-y-2">
              <li><a href="/" className="hover:text-white">Home</a></li>
              <li><a href="/auth/signup" className="hover:text-white">Sign Up</a></li>
              <li><a href="/auth/login" className="hover:text-white">Login</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Support</h4>
            <p className="text-gray-400">WhatsApp: 0534436642</p>
            <p className="text-gray-400">Email: support@fevadata.com</p>
          </div>
        </div>
        <div className="border-t border-gray-700 pt-8">
          <p className="text-center text-gray-400">&copy; 2026 FEVA Business Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
