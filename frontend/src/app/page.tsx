'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  GraduationCap, Users, BookOpen, DollarSign, Calendar, 
  FileText, TrendingUp, Shield, Smartphone, Cloud, 
  CheckCircle, MessageSquare, Heart, Briefcase, 
  CreditCard, Send, BarChart3, Clock, Award, Building2,
  ChevronRight, Menu, X
} from 'lucide-react'

interface School {
  id: string
  name: string
  logo_url: string
}

export default function LandingPage() {
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [schools, setSchools] = useState<School[]>([])
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    const user = localStorage.getItem('user')
    if (user) {
      router.push('/dashboard')
    }
    
    // Fetch schools
    fetch('http://localhost:8080/api/public/schools')
      .then(res => res.json())
      .then(data => setSchools(data.schools || []))
      .catch(err => console.error('Failed to fetch schools:', err))

    // Active section tracking
    const handleScroll = () => {
      const sections = ['home', 'features', 'contact']
      const scrollPosition = window.scrollY + 100

      for (const section of sections) {
        const element = document.getElementById(section)
        if (element) {
          const { offsetTop, offsetHeight } = element
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [router])

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Multi-Section Support",
      description: "ECCE, P1-P7, S1-S6 with standardized curriculum subjects"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Role-Based Access",
      description: "Admin, Teacher, Bursar, Librarian, Nurse, Parent portals"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "UNEB & NCDC Grading",
      description: "Automated grading engines with PDF report generation"
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Finance Management",
      description: "Fees tracking, payroll, budgets, requisitions & expenditure"
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "SchoolPay Integration",
      description: "Real-time mobile money payments via SchoolPay Uganda"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "SMS Management",
      description: "Automated fees reminders & attendance alerts"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Attendance Tracking",
      description: "Daily attendance with holidays & term dates management"
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Library Management",
      description: "Book cataloging, issues, returns & inventory tracking"
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Clinic Management",
      description: "Health profiles, medical records & clinic visits"
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Payroll System",
      description: "Salary structures, monthly processing & payment tracking"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Real-time insights on performance, fees & attendance"
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Offline-First",
      description: "Marks entry works offline, syncs when online"
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Parent Portal",
      description: "View children's progress, fees, attendance & reports"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance Analytics",
      description: "Class rankings, subject analysis & trend reports"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Audit Logging",
      description: "Complete activity tracking for security & compliance"
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Multi-Tenant",
      description: "Secure data isolation with subdomain routing"
    }
  ]



  return (
    <div className="min-h-screen bg-white">
      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/256784828791"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
        aria-label="Chat on WhatsApp"
      >
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>

      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <span className="text-xl sm:text-2xl font-bold text-gray-900">Acadistra</span>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a 
                href="#home" 
                className={`transition ${activeSection === 'home' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Home
              </a>
              <a 
                href="#features" 
                className={`transition ${activeSection === 'features' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Features
              </a>
              <a 
                href="#contact" 
                className={`transition ${activeSection === 'contact' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Contact
              </a>
              <button
                onClick={() => router.push('/login')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-600"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-200">
            <div className="px-4 py-4 space-y-3">
              <a 
                href="#home" 
                className={`block transition ${activeSection === 'home' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a 
                href="#features" 
                className={`block transition ${activeSection === 'features' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#contact" 
                className={`block transition ${activeSection === 'contact' ? 'text-blue-600 font-semibold' : 'text-gray-600 hover:text-blue-600'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <button
                onClick={() => router.push('/login')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="home" className="pt-24 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Modern School Management
            <span className="block text-blue-600 mt-2">Built for Ugandan Schools</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Comprehensive system serving ECCE → S6 with UNEB & NCDC compliance, 
            real-time mobile money payments, automated SMS alerts, and complete management tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="#contact"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition flex items-center justify-center gap-2"
            >
              Request Demo <ChevronRight className="w-5 h-5" />
            </a>
            <button
              onClick={() => router.push('/login')}
              className="w-full sm:w-auto border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-8 py-4 rounded-lg text-lg font-semibold transition"
            >
              Login to System
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 flex flex-wrap justify-center items-center gap-6 sm:gap-8 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">Production Ready</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">UNEB & NCDC Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">Secure & Reliable</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="font-semibold">Active Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your School
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Comprehensive features designed specifically for Ugandan schools, from nursery to senior six.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 bg-white border border-gray-200 rounded-xl hover:shadow-lg hover:border-blue-300 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schools Section */}
      <section id="schools" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Schools Across Uganda
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Join growing institutions already using Acadistra to modernize their school management.
            </p>
          </div>

          <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {schools.length > 0 ? (
              schools.map((school) => (
                <div
                  key={school.id}
                  className="bg-white p-8 rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 flex items-center justify-center"
                >
                  <div className="w-24 h-24 relative">
                    <img
                      src={`http://localhost:8080${school.logo_url}`}
                      alt="School logo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="%232563eb" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E'
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                Loading schools...
              </div>
            )}
          </div>

          {/* Mobile Slider */}
          <div className="sm:hidden relative overflow-hidden py-4">
            <div className="flex animate-slide gap-6" style={{ width: 'max-content' }}>
              {schools.length > 0 ? (
                [...schools, ...schools, ...schools].map((school, index) => (
                  <div
                    key={`${school.id}-${index}`}
                    className="flex-shrink-0 bg-white p-6 rounded-xl border border-gray-200 flex items-center justify-center"
                    style={{ width: '160px' }}
                  >
                    <div className="w-20 h-20 relative">
                      <img
                        src={`http://localhost:8080${school.logo_url}`}
                        alt="School logo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%232563eb" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full text-center py-8 text-gray-500">
                  Loading schools...
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Professional Technology for Schools
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Built with modern, reliable infrastructure designed for educational institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Mobile-First & Offline-Ready</h3>
              <p className="text-gray-600">Works on any device. Marks entry continues offline and syncs automatically when online</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise-Grade Security</h3>
              <p className="text-gray-600">Argon2 encryption, JWT authentication, role-based access, and complete audit trails</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cloud-Based & Scalable</h3>
              <p className="text-gray-600">Access anywhere, anytime. Automated daily backups and reliable uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Modernize Your School Management?
          </h2>
          <p className="text-lg sm:text-xl mb-8 opacity-90">
            Get a personalized demo and see how Acadistra can transform your school operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <a
              href="mailto:admin@acadistra.com"
              className="w-full sm:w-auto bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 rounded-lg text-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" />
              Email Us
            </a>
            <a
              href="https://wa.me/256784828791"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              WhatsApp Us
            </a>
          </div>

          <div className="border-t border-white/20 pt-8">
            <p className="text-lg font-semibold mb-2">Get Started Today</p>
            <p className="opacity-90">📧 Email: admin@acadistra.com</p>
            <p className="opacity-90">📱 WhatsApp: +256 784 828 791</p>
            <p className="opacity-90 mt-2 text-sm">⚡ Quick response during business hours</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <GraduationCap className="w-6 h-6 text-blue-500" />
                <span className="text-xl font-bold text-white">Acadistra</span>
              </div>
              <p className="text-sm">
                Complete school management system for Ugandan schools (ECCE → S6)
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Why Acadistra</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#schools" className="hover:text-white transition">Our Schools</a></li>
                <li><a href="#contact" className="hover:text-white transition">Case Studies</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:admin@acadistra.com" className="hover:text-white transition">Contact Sales</a></li>
                <li><a href="https://wa.me/256784828791" className="hover:text-white transition">WhatsApp Support</a></li>
                <li><a href="/login" className="hover:text-white transition">Client Login</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="mailto:admin@acadistra.com" className="hover:text-white transition">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Acadistra. All rights reserved. Built for Ugandan schools 🇺🇬</p>
            <p className="mt-2 text-xs opacity-75">UNEB & NCDC Compliant | Professional School Management System</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
