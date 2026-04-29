'use client'

import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface NurseryReportCardProps {
  student: any
  results: any[]
  subjects: any[]
  term: string
  year: string
  examType: string
  school: any
  outstandingBalance: number
  nextTermBegins: string
  nextTermEnds: string
  pageBreak?: boolean
}

export default function NurseryReportCard({
  student,
  results,
  subjects,
  term,
  year,
  examType,
  school,
  outstandingBalance,
  nextTermBegins,
  nextTermEnds,
  pageBreak = false
}: NurseryReportCardProps) {
  
  const getGradeComment = (avgNum: number) => {
    if (avgNum >= 90) return 'Mastering'
    if (avgNum >= 75) return 'Secure'
    if (avgNum >= 60) return 'Developing'
    if (avgNum >= 40) return 'Emerging'
    return 'Not Yet'
  }

  const calculateStats = () => {
    if (!results || results.length === 0) return { total: '0', average: '0' }
    let total = 0
    let count = 0
    
    results.forEach((r: any) => {
      const ca = r.raw_marks?.ca || 0
      const exam = r.raw_marks?.exam || 0
      if (ca > 0 || exam > 0) {
        total += ca + exam
        count++
      }
    })
    
    const average = count > 0 ? total / (count * 2) : 0
    return { total: total.toFixed(1), average: average.toFixed(1) }
  }

  const stats = calculateStats()

  return (
    <div className={`report-card bg-white mx-auto`} style={{ width: '210mm', height: '297mm', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', pageBreakAfter: pageBreak ? 'always' : 'auto' }} data-print-item="true">
      <div style={{ display: 'flex', flexDirection: 'column', border: '3px solid #000', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ background: 'white', color: '#000', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '3px solid #000' }}>
          {school?.logo_url && (
            <ImageWithFallback 
              src={school.logo_url} 
              alt="School Logo" 
              className="object-contain bg-white rounded border-2 border-black p-1"
              style={{ height: '60px', width: '60px' }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M22 10v6M2 10l10-5 10 5-10 5z'/%3E%3Cpath d='M6 12v5c3 3 9 3 12 0v-5'/%3E%3C/svg%3E"
            />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {school?.name}
            </h1>
            <p style={{ fontSize: '11px', margin: '0 0 2px 0', fontStyle: 'italic', color: '#000' }}>
              {school?.motto}
            </p>
            <p style={{ fontSize: '10px', margin: 0, color: '#000' }}>
              {school?.address} • {school?.phone} • {school?.contact_email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'white', color: '#000', padding: '8px 12px', borderRadius: '4px', border: '3px solid #000' }}>
              <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, textTransform: 'uppercase' }}>NURSERY REPORT</p>
              <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: '#000' }}>{year} • {term}</p>
              <p style={{ fontSize: '9px', margin: '1px 0 0 0', color: '#000' }}>{examType}</p>
            </div>
          </div>
          {student?.photo_url ? (
            <ImageWithFallback 
              src={student.photo_url}
              alt="Student Photo"
              className="object-cover rounded border-2 border-black"
              style={{ height: '60px', width: '60px' }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23f3f4f6'%3E%3Cpath d='M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z' fill='%239CA3AF'/%3E%3Cpath d='M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z' fill='%239CA3AF'/%3E%3C/svg%3E"
            />
          ) : (
            <div style={{ height: '60px', width: '60px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#9CA3AF"/>
                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#9CA3AF"/>
              </svg>
            </div>
          )}
        </div>

        {/* Student Information Bar */}
        <div style={{ background: '#f8fafc', padding: '10px 20px', borderBottom: '2px solid #000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '14px', fontSize: '12px' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Student Name</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Admission No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '12px' }}>{student.admission_no}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '12px' }}>{student.class_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '12px' }}>{student.gender}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: '12px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance Table */}
          <div style={{ marginBottom: '10px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 8px 0', textAlign: 'center', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '3px' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'left', fontWeight: '700', fontSize: '11px', width: '180px' }}>LEARNING AREA</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '40px', fontSize: '11px' }}>CA</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '45px', fontSize: '11px' }}>EXAM</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '45px', fontSize: '11px' }}>AVG</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '100px', fontSize: '11px' }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject: any, index: number) => {
                  const result = results?.find((r: any) => r.subject_id === subject.id)
                  const ca = result?.raw_marks?.ca || 0
                  const exam = result?.raw_marks?.exam || 0
                  const hasMarks = ca > 0 || exam > 0
                  const avg = hasMarks ? ((ca + exam) / 2).toFixed(1) : ''
                  const avgNum = parseFloat(avg || '0')
                  const remark = avgNum > 0 ? getGradeComment(avgNum) : ''
                  
                  return (
                    <tr key={subject.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #000', padding: '5px', fontWeight: '600', fontSize: '10px' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '10px' }}>{ca || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '10px' }}>{exam || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: '700', fontSize: '11px' }}>{avg}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '9px', fontStyle: 'italic' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '8px', border: '2px solid #000', borderRadius: '4px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>Nursery Grading Scale</p>
              <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '9px', fontWeight: '600' }}>
                <span style={{ background: 'white', padding: '2px 4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>Mastering: 90-100</span>
                <span style={{ background: 'white', padding: '2px 4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>Secure: 75-89</span>
                <span style={{ background: 'white', padding: '2px 4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>Developing: 60-74</span>
                <span style={{ background: 'white', padding: '2px 4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>Emerging: 40-59</span>
                <span style={{ background: 'white', padding: '2px 4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>Not Yet: 0-39</span>
              </div>
            </div>
          </div>

          {/* Performance Summary & Comments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            
            {/* Performance Summary */}
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
                Performance Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', textAlign: 'center', border: '2px solid #000', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Total Marks</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{stats.total}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', textAlign: 'center', border: '2px solid #000', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>Average</p>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>{stats.average}%</p>
                </div>
              </div>
            </div>

            {/* Teacher Comments */}
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
                Teacher Comments
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '8px', border: '2px solid #000', borderRadius: '4px', marginBottom: '6px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 3px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                <p style={{ fontSize: '9px', margin: '0 0 6px 0', lineHeight: '1.3', minHeight: '24px' }}>
                  {parseFloat(stats.average) >= 80 ? 'Excellent work! Keep up the outstanding performance.' :
                   parseFloat(stats.average) >= 65 ? 'Very good progress shown. Continue with effort.' :
                   parseFloat(stats.average) >= 50 ? 'Good effort demonstrated. Keep working hard.' :
                   'Needs more support and practice for improvement.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>
                  <p style={{ fontSize: '7px', margin: 0 }}>Signature: ___________</p>
                </div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '8px', border: '2px solid #000', borderRadius: '4px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 3px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                <p style={{ fontSize: '9px', margin: '0 0 6px 0', lineHeight: '1.3', minHeight: '24px' }}>
                  {parseFloat(stats.average) >= 80 ? 'Outstanding performance! Well done.' :
                   parseFloat(stats.average) >= 65 ? 'Well done! Keep up the good work.' :
                   parseFloat(stats.average) >= 50 ? 'Keep improving and working hard.' :
                   'Needs serious intervention and support.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '3px' }}>
                  <p style={{ fontSize: '7px', margin: 0 }}>Sign & Stamp: ___________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Fees Status - Separate Section */}
          <div style={{ marginBottom: '10px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
              Fees Status
            </h3>
            <div style={{ background: '#f8fafc', padding: '10px', border: '2px solid #000', borderRadius: '4px', height: '50px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '10px', fontWeight: '600' }}>Outstanding Balance:</span>
                <span style={{ fontSize: '14px', fontWeight: '700' }}>UGX {outstandingBalance?.toLocaleString() || '0'}</span>
              </div>
              {outstandingBalance > 0 && (
                <p style={{ fontSize: '8px', margin: 0, fontStyle: 'italic', color: '#dc2626', background: 'white', padding: '2px', borderRadius: '2px', border: '1px solid #dc2626' }}>
                  Please clear outstanding fees before next term.
                </p>
              )}
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '10px 12px', border: '2px solid #000', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
              <div>
                <p style={{ margin: '0 0 3px 0', fontWeight: '700', color: '#000' }}>Next Term Information</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opens:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '___________'} • 
                  <strong> Closes:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '___________'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '8px', fontStyle: 'italic', color: '#000' }}>
                  Official School Document
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '7px', color: '#000' }}>
                  Alteration Prohibited
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'white', color: '#000', padding: '8px 16px', textAlign: 'center', fontSize: '8px', borderTop: '3px solid #000' }}>
          <p style={{ margin: 0, fontWeight: '600' }}>
            © {year} {school?.name} • Empowering Excellence in Education • Building Tomorrow's Leaders
          </p>
        </div>
      </div>
    </div>
  )
}
