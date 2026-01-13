import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { resultsApi, subjectsApi, schoolsApi, feesApi } from '@/services/api';
import * as XLSX from 'xlsx';

interface ReportCardProps {
  students: any[];
}

export default function ReportCard({ students }: ReportCardProps) {
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [term, setTerm] = useState('Term1');
  const [year, setYear] = useState('2026');
  const [school, setSchool] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'single' | 'bulk'>('single');
  const [nextTermBegins, setNextTermBegins] = useState('');
  const [nextTermEnds, setNextTermEnds] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.school_id) {
      schoolsApi.get(user.school_id)
        .then(school => setSchool(school))
        .catch(err => {
          console.error('Failed to fetch school details:', err);
          if (user.school) {
            setSchool(user.school);
          }
        });
    } else if (user.school) {
      setSchool(user.school);
    }
  }, []);

  const exportMarksToExcel = async () => {
    const classStudents = selectedClass === 'all' ? students : filteredStudents;
    const marksData = [];
    
    for (const student of classStudents) {
      try {
        const results = await resultsApi.getByStudent(student.id, { term, year });
        const subjects = await subjectsApi.list({ level: student.class_name });
        
        const studentRow: any = {
          'Student Name': `${student.first_name} ${student.last_name}`,
          'Admission No': student.admission_no,
          'Class': student.class_name,
          'Gender': student.gender
        };
        
        subjects?.forEach((subject: any) => {
          const result = results?.find((r: any) => r.subject_id === subject.id);
          studentRow[`${subject.name} - CA`] = result?.raw_marks?.ca || '';
          studentRow[`${subject.name} - Exam`] = result?.raw_marks?.exam || '';
          studentRow[`${subject.name} - Total`] = result?.raw_marks?.total || '';
          studentRow[`${subject.name} - Grade`] = result?.final_grade || '';
        });
        
        const total = results?.reduce((sum: number, r: any) => sum + (r.raw_marks?.total || 0), 0) || 0;
        const average = results?.length > 0 ? (total / results.length).toFixed(1) : '0';
        
        studentRow['Total Marks'] = total.toString();
        studentRow['Average'] = average;
        
        marksData.push(studentRow);
      } catch (error) {
        console.error(`Error fetching data for ${student.first_name}:`, error);
      }
    }
    
    const ws = XLSX.utils.json_to_sheet(marksData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedClass}_${term}_${year}`);
    XLSX.writeFile(wb, `marks_${selectedClass}_${term}_${year}.xlsx`);
  };

  const downloadStudentPDF = async () => {
    if (!selectedStudent) return;
    setPrintMode('single');
    
    setTimeout(async () => {
      const reportCard = document.querySelector('.report-card');
      if (!reportCard) return;
      
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const canvas = await html2canvas(reportCard as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        removeContainer: true,
        imageTimeout: 0,
        logging: false,
        width: Math.round(210 * 3.78),
        height: Math.round(297 * 3.78)
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      const imgWidth = pdfWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      pdf.save(`${selectedStudent.first_name}_${selectedStudent.last_name}_Report_Card.pdf`);
    }, 100);
  };

  const downloadClassPDF = async () => {
    if (selectedClass === 'all') return;
    setPrintMode('bulk');
    
    setTimeout(async () => {
      const reportCards = document.querySelectorAll('.report-card');
      if (reportCards.length === 0) return;
      
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = 297;
      
      for (let i = 0; i < reportCards.length; i++) {
        const canvas = await html2canvas(reportCards[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true,
          imageTimeout: 0,
          logging: false,
          width: 794,
          height: 1123
        });
        
        const imgData = canvas.toDataURL('image/png', 1.0);
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, Math.min(imgHeight, pdfHeight - 20));
      }
      
      pdf.save(`${selectedClass}_Report_Cards.pdf`);
    }, 100);
  };

  const printStudentCard = () => {
    if (!selectedStudent) return;
    setPrintMode('single');
    setTimeout(() => window.print(), 100);
  };

  const printClassCards = () => {
    if (selectedClass === 'all') return;
    setPrintMode('bulk');
    setTimeout(() => window.print(), 100);
  };

  const filteredStudents = selectedClass === 'all' 
    ? students 
    : students?.filter((s: any) => s.class_name === selectedClass);

  const uniqueClasses = [...new Set(students?.map((s: any) => s.class_name))];

  return (
    <div>
      <div className="mb-6 sm:mb-8 no-print px-3 sm:px-0">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">📋 Report Cards</h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1 font-medium">View and print student report cards</p>
          </div>
          <div className="flex flex-col gap-3">
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              className="w-full sm:w-auto border border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white font-medium"
            >
              <option value="all">All Classes</option>
              {uniqueClasses?.map((cls: string) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={exportMarksToExcel}
                className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
              >
                📊 <span className="hidden sm:inline">Export Marks (Excel)</span><span className="sm:hidden">Export Excel</span>
              </button>
              {selectedClass !== 'all' && (
                <>
                  <button
                    onClick={downloadClassPDF}
                    className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                  >
                    📄 <span className="hidden sm:inline">Class PDF ({filteredStudents?.length})</span><span className="sm:hidden">PDF ({filteredStudents?.length})</span>
                  </button>
                  <button
                    onClick={printClassCards}
                    className="w-full sm:w-auto bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                  >
                    🖨️ <span className="hidden sm:inline">Print Class</span><span className="sm:hidden">Print</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="no-print px-3 sm:px-0">
        {/* Mobile Student Selection */}
        <div className="block lg:hidden mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
              👥 Select Student
            </h3>
            <select
              value={selectedStudent?.id || ''}
              onChange={(e) => {
                const student = filteredStudents?.find(s => s.id === e.target.value);
                if (student) {
                  setSelectedStudent(student);
                  setPrintMode('single');
                }
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50 focus:bg-white"
            >
              <option value="">Choose a student...</option>
              {filteredStudents?.map((student: any) => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} - {student.class_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:grid lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              👥 Select Student
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredStudents?.map((student: any) => (
                <button
                  key={student.id}
                  onClick={() => { setSelectedStudent(student); setPrintMode('single'); }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedStudent?.id === student.id
                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-md'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-gray-200'
                  }`}
                >
                  <p className="font-semibold text-gray-900">{student.first_name} {student.last_name}</p>
                  <p className="text-sm text-gray-600">{student.class_name}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            {selectedStudent ? (
              <>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                  <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    📄 Report Card Preview
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadStudentPDF}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                    >
                      📄 Download PDF
                    </button>
                    <button
                      onClick={printStudentCard}
                      className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-4 py-2 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                    >
                      🖨️ Print
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Term</label>
                    <select 
                      value={term} 
                      onChange={(e) => setTerm(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option>Term1</option>
                      <option>Term2</option>
                      <option>Term3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Year</label>
                    <input 
                      type="number" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Next Term Begins</label>
                    <input 
                      type="date" 
                      value={nextTermBegins} 
                      onChange={(e) => setNextTermBegins(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Next Term Ends</label>
                    <input 
                      type="date" 
                      value={nextTermEnds} 
                      onChange={(e) => setNextTermEnds(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-gray-500 text-lg">Select a student to view their report card</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Report Card Controls */}
        {selectedStudent && (
          <div className="block lg:hidden">
            <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100 mb-4">
              <div className="flex flex-col gap-3">
                <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  📄 Report Card: {selectedStudent.first_name} {selectedStudent.last_name}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={downloadStudentPDF}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-2 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                  >
                    📄 PDF
                  </button>
                  <button
                    onClick={printStudentCard}
                    className="flex-1 bg-gradient-to-r from-gray-600 to-gray-700 text-white px-3 py-2 rounded-xl font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                  >
                    🖨️ Print
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Term</label>
                    <select 
                      value={term} 
                      onChange={(e) => setTerm(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    >
                      <option>Term1</option>
                      <option>Term2</option>
                      <option>Term3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Year</label>
                    <input 
                      type="number" 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Next Term Begins</label>
                    <input 
                      type="date" 
                      value={nextTermBegins} 
                      onChange={(e) => setNextTermBegins(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Next Term Ends</label>
                    <input 
                      type="date" 
                      value={nextTermEnds} 
                      onChange={(e) => setNextTermEnds(e.target.value)} 
                      className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white" 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {printMode === 'bulk' && selectedClass !== 'all' ? (
        filteredStudents?.map((student: any, index: number) => (
          <ReportCardTemplate 
            key={student.id}
            student={student}
            term={term}
            year={year}
            school={school}
            nextTermBegins={nextTermBegins}
            nextTermEnds={nextTermEnds}
            pageBreak={index < filteredStudents.length - 1}
          />
        ))
      ) : selectedStudent && printMode === 'single' && (
        <ReportCardTemplate 
          student={selectedStudent}
          term={term}
          year={year}
          school={school}
          nextTermBegins={nextTermBegins}
          nextTermEnds={nextTermEnds}
          pageBreak={false}
        />
      )}

      <style>{`
        @media print {
          @page { margin: 0; size: A4 portrait; }
          html, body { margin: 0; padding: 0; height: 100%; }
          body * { visibility: hidden; }
          .report-card, .report-card * { visibility: visible; }
          .report-card {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 6mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-after: avoid !important;
            overflow: hidden !important;
            border: 3px solid #1e3a8a !important;
            box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>
    </div>
  );
}

function ReportCardTemplate({ student, term, year, school, nextTermBegins, nextTermEnds, pageBreak }: {
  student: any;
  term: string;
  year: string;
  school: any;
  nextTermBegins: string;
  nextTermEnds: string;
  pageBreak?: boolean;
}) {
  const { data: results } = useQuery({
    queryKey: ['results', student?.id, term, year],
    queryFn: () => resultsApi.getByStudent(student.id, { term, year }),
    enabled: !!student,
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects', student?.class_name],
    queryFn: () => subjectsApi.list({ level: student?.class_name }),
    enabled: !!student?.class_name,
  });

  const { data: currentFees } = useQuery({
    queryKey: ['student-fees', student?.id, term, year],
    queryFn: async () => {
      const allFees = await feesApi.list({ term, year: parseInt(year) });
      return allFees.find((f: any) => f.student_id === student.id);
    },
    enabled: !!student,
  });

  const calculateStats = () => {
    if (!results || results.length === 0) return { total: '0', average: '0' };
    const total = results.reduce((sum: number, r: any) => sum + (r.raw_marks?.total || 0), 0);
    const average = total / results.length;
    return { total: total.toFixed(1), average: average.toFixed(1) };
  };

  const stats = calculateStats();

  return (
    <div className={`report-card bg-white mx-auto ${pageBreak ? 'page-break' : ''}`} style={{ width: '210mm', height: '297mm', padding: '6mm', position: 'relative', boxSizing: 'border-box', border: '2px solid black', fontSize: '10px', lineHeight: '1.1' }}>
      
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-2 mb-2">
        {school?.logo_url && (
          <div className="flex justify-center mb-1">
            <img src={school.logo_url} alt="School Logo" className="h-12 w-12 object-contain" />
          </div>
        )}
        <h1 className="text-base font-bold uppercase">{school?.name}</h1>
        <p className="text-xs italic">"{school?.motto}"</p>
        <p className="text-xs">{school?.address} | Tel: {school?.phone} | Email: {school?.contact_email}</p>
        <div className="mt-2 border-2 border-black py-1">
          <h2 className="text-sm font-bold uppercase tracking-wide">STUDENT REPORT CARD</h2>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-2 gap-3 mb-2 text-xs border border-black p-2">
        <div>
          <p><strong>Student Name:</strong> {student.first_name} {student.last_name}</p>
          <p><strong>Admission No:</strong> {student.admission_no}</p>
          <p><strong>LIN:</strong> {student.lin || 'N/A'}</p>
          <p><strong>Class:</strong> {student.class_name}</p>
        </div>
        <div>
          <p><strong>Term:</strong> {term}</p>
          <p><strong>Year:</strong> {year}</p>
          <p><strong>Gender:</strong> {student.gender}</p>
        </div>
      </div>

      {/* Marks Table */}
      <table className="w-full border-collapse border-2 border-black mb-2 text-xs">
        <thead>
          <tr className="bg-gray-200">
            <th className="border border-black px-1 py-1 font-bold">SUBJECT</th>
            <th className="border border-black px-1 py-1 font-bold w-10">CA/20</th>
            <th className="border border-black px-1 py-1 font-bold w-10">EXAM/80</th>
            <th className="border border-black px-1 py-1 font-bold w-10">TOTAL</th>
            <th className="border border-black px-1 py-1 font-bold w-8">GRADE</th>
            <th className="border border-black px-1 py-1 font-bold w-16">REMARKS</th>
          </tr>
        </thead>
        <tbody>
          {subjects?.map((subject: any) => {
            const result = results?.find((r: any) => r.subject_id === subject.id);
            const total = result?.raw_marks?.total || 0;
            const hasMarks = result && (result.raw_marks?.ca || result.raw_marks?.exam || result.raw_marks?.total);
            const grade = hasMarks ? (result?.final_grade || '').trim() : '';
            const remark = hasMarks ? (
              grade === 'A' ? 'Excellent' :
              grade === 'B' ? 'Very Good' :
              grade === 'C' ? 'Good' :
              grade === 'D' ? 'Fair' :
              grade === 'E' ? 'Needs Improvement' : ''
            ) : '';
            
            return (
              <tr key={subject.id}>
                <td className="border border-black px-1 py-0.5">{subject.name}</td>
                <td className="border border-black px-1 py-0.5 text-center">{result?.raw_marks?.ca || ''}</td>
                <td className="border border-black px-1 py-0.5 text-center">{result?.raw_marks?.exam || ''}</td>
                <td className="border border-black px-1 py-0.5 text-center font-bold">{total || ''}</td>
                <td className="border border-black px-1 py-0.5 text-center font-bold">{grade}</td>
                <td className="border border-black px-1 py-0.5">{remark}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
        <div className="border border-black p-2 text-center">
          <p className="font-bold">TOTAL MARKS</p>
          <p className="text-lg font-bold">{stats.total}</p>
        </div>
        <div className="border border-black p-2 text-center">
          <p className="font-bold">AVERAGE</p>
          <p className="text-lg font-bold">{stats.average}%</p>
        </div>
      </div>

      {/* Grading Scale */}
      <div className="mb-2">
        <p className="font-bold text-xs text-center mb-1">GRADING SCALE</p>
        <div className="flex justify-center">
          <table className="border-collapse border border-black text-xs">
            <tbody>
              <tr>
                <td className="border border-black px-2 py-1 text-center font-bold">A: 80-100</td>
                <td className="border border-black px-2 py-1 text-center font-bold">B: 65-79</td>
                <td className="border border-black px-2 py-1 text-center font-bold">C: 50-64</td>
                <td className="border border-black px-2 py-1 text-center font-bold">D: 35-49</td>
                <td className="border border-black px-2 py-1 text-center font-bold">E: 0-34</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Comments */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="border border-black p-2">
          <p className="font-bold text-xs mb-1">CLASS TEACHER'S COMMENT:</p>
          <p className="text-xs min-h-[25px]">
            {parseFloat(stats.average.toString()) >= 80 ? 'Excellent performance! Keep up the outstanding work.' :
             parseFloat(stats.average.toString()) >= 65 ? 'Very good performance. Continue working hard.' :
             parseFloat(stats.average.toString()) >= 50 ? 'Good effort. There is room for improvement.' :
             parseFloat(stats.average.toString()) >= 35 ? 'Fair performance. More effort is needed.' :
             'Needs significant improvement. Extra support recommended.'}
          </p>
        </div>
        <div className="border border-black p-2">
          <p className="font-bold text-xs mb-1">HEADTEACHER'S COMMENT:</p>
          <p className="text-xs min-h-[25px]">
            {parseFloat(stats.average.toString()) >= 80 ? 'Outstanding achievement! Exemplary student.' :
             parseFloat(stats.average.toString()) >= 65 ? 'Commendable performance. Well done!' :
             parseFloat(stats.average.toString()) >= 50 ? 'Satisfactory progress. Keep improving.' :
             parseFloat(stats.average.toString()) >= 35 ? 'Requires more dedication and focus.' :
             'Immediate intervention required. Arrange parent meeting.'}
          </p>
        </div>
      </div>

      {/* Fees Information */}
      <div className="mb-2">
        <p className="font-bold text-xs text-center mb-1">FEES INFORMATION</p>
        <table className="w-full border-collapse border border-black text-xs">
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1 font-bold">Current Term Outstanding Balance:</td>
              <td className="border border-black px-2 py-1 text-right font-bold text-red-600">
                UGX {currentFees?.outstanding?.toLocaleString() || '0'}
              </td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1 font-bold">Next Term Total Fees:</td>
              <td className="border border-black px-2 py-1 text-right font-bold">
                UGX {currentFees?.total_fees?.toLocaleString() || '0'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <div className="text-center">
          <div className="border-t border-black mt-6 pt-1">
            <p className="font-bold text-xs">CLASS TEACHER</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-black mt-6 pt-1">
            <p className="font-bold text-xs">HEADTEACHER</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center border-t border-black pt-1">
        <div className="flex justify-center gap-6 mb-1 text-xs">
          <span>Next term begins: {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '_______________'}</span>
          <span>Next term ends: {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '_______________'}</span>
        </div>
        <p className="italic text-xs">This is an official document. Any alteration renders it invalid.</p>
      </div>
      
    </div>
  );
}