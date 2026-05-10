"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Users,
  BookOpen,
  DollarSign,
  Calendar,
  FileText,
  TrendingUp,
  Shield,
  Smartphone,
  Cloud,
  CheckCircle,
  MessageSquare,
  Heart,
  Briefcase,
  CreditCard,
  Send,
  BarChart3,
  Clock,
  Award,
  Building2,
  Menu,
  X,
  Sparkles,
  Zap,
  Star,
  ArrowRight,
} from "lucide-react";

interface School {
  id: string;
  name: string;
  logo_url: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    // Fetch schools
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
    fetch(`${apiUrl}/api/public/schools`)
      .then((res) => res.json())
      .then((data) => setSchools(data.schools || []))
      .catch((err) => console.error("Failed to fetch schools:", err));

    // Active section tracking
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      const sections = ["home", "features", "contact"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (
            scrollPosition >= offsetTop &&
            scrollPosition < offsetTop + offsetHeight
          ) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [router]);

  const features = [
    {
      icon: <Users className="w-6 h-6" />,
      title: "Multi-Section Support",
      description: "ECCE, P1-P7, S1-S6 with standardized curriculum subjects",
      category: "Academic",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Role-Based Access",
      description: "Admin, Teacher, Bursar, Librarian, Nurse, Parent portals",
      category: "Security",
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "UNEB & NCDC Grading",
      description: "Automated grading engines with PDF report generation",
      category: "Academic",
    },
    {
      icon: <DollarSign className="w-6 h-6" />,
      title: "Finance Management",
      description:
        "Fees tracking, payroll, budgets, requisitions & expenditure",
      category: "Finance",
    },
    {
      icon: <CreditCard className="w-6 h-6" />,
      title: "SchoolPay Integration",
      description: "Real-time mobile money payments via SchoolPay Uganda",
      category: "Finance",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "SMS Management",
      description: "Automated fees reminders & attendance alerts",
      category: "Communication",
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Attendance Tracking",
      description: "Daily attendance with holidays & term dates management",
      category: "Academic",
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Library Management",
      description: "Book cataloging, issues, returns & inventory tracking",
      category: "Operations",
    },
    {
      icon: <Heart className="w-6 h-6" />,
      title: "Clinic Management",
      description: "Health profiles, medical records & clinic visits",
      category: "Operations",
    },
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Payroll System",
      description: "Salary structures, monthly processing & payment tracking",
      category: "Finance",
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Analytics Dashboard",
      description: "Real-time insights on performance, fees & attendance",
      category: "Analytics",
    },
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Offline-First",
      description: "Marks entry works offline, syncs when online",
      category: "Technology",
    },
    {
      icon: <Award className="w-6 h-6" />,
      title: "Parent Portal",
      description: "View children's progress, fees, attendance & reports",
      category: "Communication",
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Performance Analytics",
      description: "Class rankings, subject analysis & trend reports",
      category: "Analytics",
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Audit Logging",
      description: "Complete activity tracking for security & compliance",
      category: "Security",
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Staff Management",
      description:
        "Complete staff management with attendance and leave tracking",
      category: "Operation",
    },
  ];

  const stats = [
    { value: "5000+", label: "Students Managed" },
    { value: "300+", label: "Active Teachers" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];

  return (
    <div className="min-h-screen bg-white">
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap");

        * {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
        }

        h1,
        h2,
        h3 {
          font-family: "Space Grotesk", sans-serif;
          letter-spacing: -0.02em;
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .slide-in {
          animation: slideIn 0.6s ease-out forwards;
        }

        .animate-scroll {
          animation: scroll 30s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }

        @keyframes scroll-desktop {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-desktop {
          animation: scroll-desktop 60s linear infinite;
        }

        .animate-scroll-desktop:hover {
          animation-play-state: paused;
        }

        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hover-lift:hover {
          transform: translateY(-4px);
        }

        .gradient-border {
          position: relative;
          background: white;
        }

        .gradient-border::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 2px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-mask:
            linear-gradient(#fff 0 0) content-box,
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
        }
      `}</style>
      {/* WhatsApp Floating Button */}
      <a
        href="https://wa.me/256784828791"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 z-50 group"
        aria-label="Chat on WhatsApp"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-green-500 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full p-4 shadow-2xl transition-all duration-300 group-hover:scale-110">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
          </div>
        </div>
      </a>

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-lg opacity-30"></div>
                <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-2.5 rounded-xl">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold text-gray-900">
                Acadistra
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#home"
                className={`font-medium transition-colors ${
                  activeSection === "home"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
              >
                Home
              </a>
              <a
                href="#features"
                className={`font-medium transition-colors ${
                  activeSection === "features"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
              >
                Features
              </a>
              <a
                href="#schools"
                className={`font-medium transition-colors ${
                  activeSection === "schools"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
              >
                Schools
              </a>
              <a
                href="#contact"
                className={`font-medium transition-colors ${
                  activeSection === "contact"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
              >
                Contact
              </a>
              <button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40"
              >
                Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100">
            <div className="px-4 py-6 space-y-4">
              <a
                href="#home"
                className={`block font-medium ${
                  activeSection === "home"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="#features"
                className={`block font-medium ${
                  activeSection === "features"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Features
              </a>
              <a
                href="#schools"
                className={`block font-medium ${
                  activeSection === "schools"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Schools
              </a>
              <a
                href="#contact"
                className={`block font-medium ${
                  activeSection === "contact"
                    ? "text-indigo-600"
                    : "text-gray-600 hover:text-indigo-600"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact
              </a>
              <button
                onClick={() => router.push("/login")}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold"
              >
                Login
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section
        id="home"
        className="relative pt-32 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>

        {/* Animated Orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
        <div
          className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{ animationDelay: "2s" }}
        ></div>
        <div
          className="absolute -bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"
          style={{ animationDelay: "4s" }}
        ></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-indigo-100 shadow-sm mb-8 slide-in">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">
                Trusted by Schools Across Uganda
              </span>
            </div>

            <h1
              className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight slide-in"
              style={{ animationDelay: "0.1s" }}
            >
              Transform Your School
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Into a Digital Powerhouse
              </span>
            </h1>

            <p
              className="text-xl sm:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed slide-in"
              style={{ animationDelay: "0.2s" }}
            >
              Complete school management solution for{" "}
              <span className="font-semibold text-indigo-600">
                Nursery → S6
              </span>
              . Streamline operations, boost efficiency, and empower education.
            </p>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 slide-in"
              style={{ animationDelay: "0.3s" }}
            >
              <button
                onClick={() => router.push("/login")}
                className="group relative w-full sm:w-auto overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:shadow-2xl hover:shadow-indigo-500/50 hover:scale-105"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Login Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
              <a
                href="#contact"
                className="w-full sm:w-auto bg-white border-2 border-gray-200 text-gray-800 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:border-indigo-300 hover:shadow-lg hover:scale-105"
              >
                Schedule Demo
              </a>
            </div>

            {/* Stats Bar */}
            <div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 slide-in"
              style={{ animationDelay: "0.4s" }}
            >
              {stats.map((stat, index) => (
                <div key={index} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <div className="relative bg-white border border-gray-100 rounded-2xl p-4 sm:p-6 hover-lift shadow-sm">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1 sm:mb-2">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-gray-600 font-medium">
                      {stat.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600">
                Comprehensive Features
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Everything Your School Needs
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                In One Platform
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              From student enrollment to exam results, manage every aspect
              efficiently.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-100 hover-lift hover:shadow-xl hover:border-indigo-100 transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30">
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Schools Section */}
      <section
        id="schools"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white overflow-hidden"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600">
                Trusted Partners
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Join Leading Schools
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Using Acadistra
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Trusted by educational institutions modernizing their school
              management.
            </p>
          </div>

          {schools.length > 0 ? (
            <>
              {/* Desktop Slider */}
              <div className="hidden md:block relative overflow-hidden">
                <div className="flex gap-6 animate-scroll-desktop">
                  {[...schools, ...schools, ...schools, ...schools].map(
                    (school, index) => (
                      <div
                        key={`${school.id}-${index}`}
                        className="flex-shrink-0 group relative bg-white border border-gray-100 p-6 rounded-2xl hover-lift hover:shadow-lg hover:border-indigo-100 transition-all"
                        style={{ width: "180px" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative w-20 h-20 mx-auto">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${school.logo_url}`}
                            alt={school.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Mobile Slider */}
              <div className="md:hidden relative overflow-hidden">
                <div
                  className="flex gap-4 animate-scroll"
                  style={{ width: "max-content" }}
                >
                  {[...schools, ...schools, ...schools, ...schools].map(
                    (school, index) => (
                      <div
                        key={`${school.id}-${index}`}
                        className="flex-shrink-0 bg-white border border-gray-100 p-4 rounded-2xl shadow-sm"
                        style={{ width: "140px" }}
                      >
                        <div className="w-16 h-16 mx-auto">
                          <img
                            src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}${school.logo_url}`}
                            alt={school.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%236366f1" stroke-width="2"%3E%3Cpath d="M22 10v6M2 10l10-5 10 5-10 5z"%3E%3C/path%3E%3Cpath d="M6 12v5c3 3 9 3 12 0v-5"%3E%3C/path%3E%3C/svg%3E';
                            }}
                          />
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                <span>Loading schools...</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
              <Zap className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-600">
                Enterprise Technology
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              Built with Modern
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Enterprise Technology
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Reliable infrastructure designed for educational institutions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Smartphone,
                title: "Mobile-First & Offline-Ready",
                description:
                  "Works on any device. Marks entry continues offline and syncs automatically when online",
                gradient: "from-cyan-500 to-teal-500",
              },
              {
                icon: Shield,
                title: "Enterprise-Grade Security",
                description:
                  "Argon2 encryption, JWT authentication, role-based access, and complete audit trails",
                gradient: "from-emerald-500 to-green-500",
              },
              {
                icon: Cloud,
                title: "Cloud-Based & Scalable",
                description:
                  "Access anywhere, anytime. Automated daily backups and reliable uptime",
                gradient: "from-indigo-500 to-purple-500",
              },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="group relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 border border-gray-100 hover-lift hover:shadow-xl hover:border-indigo-100 transition-all"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-purple-600/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-lg`}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                      {item.title}
                    </h3>
                    <p className="text-gray-600 text-center leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        id="contact"
        className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00em0wLTEwYzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHptMC0xMGMwLTIuMjEtMS43OS00LTQtNHMtNCAxLjc5LTQgNCAxLjc5IDQgNCA0IDQtMS43OSA0LTR6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-8">
            <Star className="w-4 h-4 text-white" />
            <span className="text-sm font-semibold text-white">
              Get Started Today
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Ready to Transform Your
            <br />
            School Management?
          </h2>
          <p className="text-xl text-indigo-100 mb-12">
            Join leading schools using Acadistra. Schedule a demo and see how we
            can help.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <a
              href="mailto:admin@acadistra.com"
              className="group w-full sm:w-auto bg-white text-indigo-600 hover:bg-gray-50 px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Email Us
            </a>
            <a
              href="https://wa.me/256784828791"
              target="_blank"
              rel="noopener noreferrer"
              className="group w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-all hover:shadow-2xl hover:scale-105 flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5 group-hover:scale-110 transition-transform" />
              WhatsApp Us
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <Send className="w-5 h-5 text-indigo-200" />
                <span className="text-indigo-100 font-semibold">Email</span>
              </div>
              <p className="text-white text-sm">admin@acadistra.com</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-indigo-200" />
                <span className="text-indigo-100 font-semibold">WhatsApp</span>
              </div>
              <p className="text-white text-sm">+256 784 828 791</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl blur-md opacity-50"></div>
                  <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-2 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                </div>
                <span className="text-xl font-bold text-white">Acadistra</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Complete school management system for Ugandan schools (Nursery →
                S6)
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>UNEB & NCDC Compliant</span>
              </div>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="#features"
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#schools"
                    className="hover:text-white transition-colors"
                  >
                    Schools
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="hover:text-white transition-colors"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:admin@acadistra.com"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
                <li>
                  <a
                    href="https://wa.me/256784828791"
                    className="hover:text-white transition-colors"
                  >
                    Support
                  </a>
                </li>
                <li>
                  <a
                    href="/login"
                    className="hover:text-white transition-colors"
                  >
                    Login
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2">
                  <Send className="w-4 h-4" />
                  <span>admin@acadistra.com</span>
                </li>
                <li className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>+256 784 828 791</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-sm text-center sm:text-left">
                © {new Date().getFullYear()} Acadistra. All rights reserved.
                Built for Ugandan schools 🇺🇬
              </p>
              <div className="flex items-center gap-4 text-sm">
                <a href="#" className="hover:text-white transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-white transition-colors">
                  Terms
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
