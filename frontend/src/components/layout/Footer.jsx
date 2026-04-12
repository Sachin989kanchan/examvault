import { Link } from 'react-router-dom'
import { BookOpen, Twitter, Youtube, Instagram } from 'lucide-react'

const Footer = () => (
  <footer className="bg-gray-900 text-gray-300 mt-16">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-white">ExamVault</span>
          </div>
          <p className="text-sm text-gray-400 mb-4 max-w-sm">
            India's trusted platform for government exam preparation. Practice with lakhs of questions for SSC, Banking, Railways, and more.
          </p>
          <div className="flex gap-3">
            {[Twitter, Youtube, Instagram].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center hover:bg-brand transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4">Exams</h3>
          <ul className="space-y-2 text-sm">
            {['SSC CGL', 'IBPS PO', 'RRB NTPC', 'UPSC CSE', 'SBI Clerk', 'NDA Exam'].map(exam => (
              <li key={exam}><a href="#" className="hover:text-white transition-colors">{exam}</a></li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4">Company</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
            <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
        <p className="text-xs text-gray-500">© {new Date().getFullYear()} ExamVault. All rights reserved.</p>
        <p className="text-xs text-gray-500">Made with ❤️ for aspirants across India</p>
      </div>
    </div>
  </footer>
)

export default Footer
