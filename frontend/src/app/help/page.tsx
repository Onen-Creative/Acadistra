'use client'

import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/ui/BeautifulComponents'
import { Mail, Phone, Book, MessageCircle, FileText, Video } from 'lucide-react'

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I reset my password?',
      a: 'Contact your system administrator to reset your password.'
    },
    {
      q: 'How do I add students?',
      a: 'Navigate to Students > Add Student or use the Import Students feature for bulk uploads.'
    },
    {
      q: 'How do I generate report cards?',
      a: 'Go to Report Cards section, select the class and term, then click Generate Reports.'
    },
    {
      q: 'How do I enter marks?',
      a: 'Teachers can enter marks by going to Marks > Enter Marks, selecting the class and subject.'
    },
    {
      q: 'How do I track attendance?',
      a: 'Go to Attendance section, select the class and date, then mark students as present or absent.'
    }
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Help & Support" 
          description="Get help and learn how to use Acadistra"
          icon="❓"
        />

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <Book className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documentation</h3>
            <p className="text-sm text-gray-600 mb-4">Browse our comprehensive guides and tutorials</p>
            <button className="text-sm text-blue-600 font-semibold hover:text-blue-700">Coming Soon →</button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Tutorials</h3>
            <p className="text-sm text-gray-600 mb-4">Watch step-by-step video guides</p>
            <button className="text-sm text-green-600 font-semibold hover:text-green-700">Coming Soon →</button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <MessageCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600 mb-4">Chat with our support team</p>
            <button className="text-sm text-purple-600 font-semibold hover:text-purple-700">Coming Soon →</button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4 last:border-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl shadow-lg p-8 text-white">
          <h2 className="text-2xl font-bold mb-4">Need More Help?</h2>
          <p className="mb-6">Contact our support team for assistance</p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <Mail className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-90">Email</p>
                <p className="font-semibold">onendavid23@gmail.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-4">
              <Phone className="w-5 h-5" />
              <div>
                <p className="text-sm opacity-90">Phone</p>
                <p className="font-semibold">+256-784-828-791</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
