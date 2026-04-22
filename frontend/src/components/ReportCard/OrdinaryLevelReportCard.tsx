'use client'

import ImageWithFallback from '@/components/ui/ImageWithFallback'


interface OrdinaryLevelReportCardProps {
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

export default function OrdinaryLevelReportCard({
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
}: OrdinaryLevelReportCardProps) {

  const getGradeComment = (grade: string) => {
    if (grade === 'A') return 'Excellent'
    if (grade === 'B') return 'Very Good'
    if (grade === 'C') return 'Good'
    if (grade === 'D') return 'Fair'
    return 'Needs Improvement'
  }

  const calculateStats = () => {
    if (!results || results.length === 0) return { total: '0', average: '0' }
    let total = 0
    let count = 0
    
    results.forEach((r: any) => {
      const ca = r.raw_marks?.ca || 0
      const exam = r.raw_marks?.exam || 0
      if (ca > 0 || exam > 0) {
        const sbPercent = (ca / 20) * 20
        const extPercent = (exam / 80) * 80
        total += sbPercent + extPercent
        count++
      }
    })
    
    return { total: total.toFixed(1), average: (count > 0 ? total / count : 0).toFixed(1) }
  }

  const stats = calculateStats()

  return (
    <div className={`report-card bg-white mx-auto`} style={{ width: '210mm', height: '297mm', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', pageBreakAfter: pageBreak ? 'always' : 'auto' }} data-print-item="true">
      <div style={{ display: 'flex', flexDirection: 'column', border: '3px solid #000', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ background: 'white', color: '#000', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid #000' }}>
          {school?.logo_url && (
            <ImageWithFallback 
              src={school.logo_url} 
              alt="School Logo" 
              className="object-contain bg-white rounded border border-black p-2"
              style={{ height: '50px', width: '50px', flexShrink: 0 }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='2'%3E%3Cpath d='M22 10v6M2 10l10-5 10 5-10 5z'/%3E%3Cpath d='M6 12v5c3 3 9 3 12 0v-5'/%3E%3C/svg%3E"
            />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.2' }}>
              {school?.name}
            </h1>
            <p style={{ fontSize: '12px', margin: '0 0 2px 0', fontStyle: 'italic', lineHeight: '1.2' }}>
              {school?.motto}
            </p>
            <p style={{ fontSize: '9px', margin: 0, lineHeight: '1.2' }}>
              {school?.address} • {school?.phone} • {school?.contact_email}
            </p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ background: 'white', color: '#000', padding: '6px 12px', borderRadius: '4px', border: '2px solid #000' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', margin: 0 }}>UCE REPORT</p>
              <p style={{ fontSize: '11px', margin: '1px 0 0 0' }}>{year} • {term}</p>
              <p style={{ fontSize: '8px', margin: '1px 0 0 0', color: '#000' }}>{examType}</p>
            </div>
          </div>
          {student?.photo_url ? (
            <ImageWithFallback 
              src={student.photo_url}
              alt="Student Photo"
              className="object-cover rounded border-2 border-black"
              style={{ height: '50px', width: '50px', flexShrink: 0 }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='50' viewBox='0 0 24 24' fill='%23f3f4f6'%3E%3Cpath d='M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z' fill='%239CA3AF'/%3E%3Cpath d='M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z' fill='%239CA3AF'/%3E%3C/svg%3E"
            />
          ) : (
            <div style={{ height: '50px', width: '50px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #000', flexShrink: 0 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#9CA3AF"/>
                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#9CA3AF"/>
              </svg>
            </div>
          )}
        </div>

        {/* Student Information Bar */}
        <div style={{ background: '#f8fafc', padding: '8px 18px', borderBottom: '3px solid #000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', fontSize: '15px' }}>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Student Name</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px', color: '#1e293b' }}>
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Admission No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.admission_no}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.class_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 1px 0', color: '#64748b', fontSize: '8px', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.gender}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '15px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance */}
          <div style={{ marginBottom: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '10px', flex: 1 }}>
              <thead>
                <tr style={{ background: 'white', color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'left', fontWeight: '600' }}>SUBJECT</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '60px' }}>CA</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '60px' }}>EXAM</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>TOTAL</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '45px' }}>GRADE</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '80px' }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject: any, index: number) => {
                  const result = results?.find((r: any) => r.subject_id === subject.id)
                  const ca = result?.raw_marks?.ca || 0
                  const exam = result?.raw_marks?.exam || 0
                  const hasMarks = ca > 0 || exam > 0
                  
                  let grade = ''
                  let totalPercent = 0
                  if (hasMarks) {
                    const sbPercent = (ca / 20) * 20
                    const extPercent = (exam / 80) * 80
                    totalPercent = sbPercent + extPercent
                    
                    if (totalPercent >= 80) grade = 'A'
                    else if (totalPercent >= 65) grade = 'B'
                    else if (totalPercent >= 50) grade = 'C'
                    else if (totalPercent >= 35) grade = 'D'
                    else grade = 'E'
                  }
                  
                  const remark = grade ? getGradeComment(grade) : ''
                  
                  return (
                    <tr key={subject.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #000', padding: '6px', fontWeight: '600', color: '#000' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{ca > 0 ? ca : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center' }}>{exam > 0 ? exam : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: '700' }}>
                        {hasMarks ? totalPercent.toFixed(0) : ''}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontWeight: '700' }}>{grade}</td>
                      <td style={{ border: '1px solid #000', padding: '6px', textAlign: 'center', fontSize: '11px', fontStyle: 'italic', color: '#000' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '3px', border: '1px solid #000' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>NCDC Grading Scale</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', fontSize: '9px' }}>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>A:</strong> 80-100</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>B:</strong> 65-79</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C:</strong> 50-64</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>D:</strong> 35-49</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>E:</strong> 0-34</span>
              </div>
              <p style={{ fontSize: '9px', margin: '3px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>CA/20 (20%) + Exam/80 (80%)</p>
            </div>
          </div>

          {/* Summary and Comments Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', marginBottom: '4px' }}>
            
            {/* Left: Performance Summary */}
            <div>
              <h3 style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 3px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '1px' }}>
                Performance Summary
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', marginBottom: '3px' }}>
                <p style={{ margin: '0 0 1px 0', fontSize: '7px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Total Marks</p>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{stats.total}</p>
              </div>
              <div style={{ background: '#f8fafc', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}>
                <p style={{ margin: '0 0 1px 0', fontSize: '7px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Average %</p>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{stats.average}%</p>
              </div>
            </div>

            {/* Right: Comments and Fees */}
            <div>
              <h3 style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 3px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '1px' }}>
                Comments & Fees
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginBottom: '3px' }}>
                <div style={{ background: '#f8fafc', padding: '4px', border: '1px solid #000', borderRadius: '2px' }}>
                  <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                  <p style={{ fontSize: '7px', margin: '0 0 4px 0', lineHeight: '1.1', color: '#000' }}>
                    {parseFloat(stats.average) >= 80 ? 'Excellent! Keep it up.' :
                     parseFloat(stats.average) >= 65 ? 'Very good work.' :
                     parseFloat(stats.average) >= 50 ? 'Good effort.' :
                     parseFloat(stats.average) >= 35 ? 'More effort needed.' :
                     'Needs improvement.'}
                  </p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                    <p style={{ fontSize: '6px', margin: 0, fontWeight: '600' }}>Sign: _____</p>
                  </div>
                </div>
                
                <div style={{ background: '#f8fafc', padding: '4px', border: '1px solid #000', borderRadius: '2px' }}>
                  <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                  <p style={{ fontSize: '7px', margin: '0 0 4px 0', lineHeight: '1.1', color: '#000' }}>
                    {parseFloat(stats.average) >= 80 ? 'Outstanding!' :
                     parseFloat(stats.average) >= 65 ? 'Commendable!' :
                     parseFloat(stats.average) >= 50 ? 'Satisfactory.' :
                     parseFloat(stats.average) >= 35 ? 'More dedication.' :
                     'Intervention needed.'}
                  </p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '1px' }}>
                    <p style={{ fontSize: '6px', margin: 0, fontWeight: '600' }}>Sign: _____</p>
                  </div>
                </div>
              </div>

              {/* Fees */}
              <div style={{ background: '#f8fafc', padding: '4px', border: '1px solid #000', borderRadius: '2px' }}>
                <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Fees Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '7px', color: '#000' }}>Outstanding:</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#000' }}>
                    UGX {outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                {outstandingBalance > 0 && (
                  <p style={{ fontSize: '6px', margin: '1px 0 0 0', color: '#000', fontStyle: 'italic' }}>
                    Please clear outstanding fees.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '4px', border: '1px solid #000', borderRadius: '2px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px' }}>
              <div>
                <p style={{ margin: '0 0 1px 0', fontWeight: '700', color: '#000' }}>Next Term Dates</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opens:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '____'} • 
                  <strong> Closes:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '____'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '6px', fontStyle: 'italic', color: '#000' }}>
                  Official document. Alteration prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'white', color: '#000', padding: '4px 10px', textAlign: 'center', fontSize: '6px', borderTop: '2px solid #000' }}>
          <p style={{ margin: 0 }}>
            © {year} {school?.name} • Empowering Excellence in Education
          </p>
        </div>
      </div>
    </div>
  )
}
