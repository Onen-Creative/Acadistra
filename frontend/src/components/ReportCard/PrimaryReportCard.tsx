'use client'

import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface PrimaryReportCardProps {
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

export default function PrimaryReportCard({
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
}: PrimaryReportCardProps) {
  
  const getGradeComment = (percentage: number) => {
    if (percentage >= 90) return 'Excellent'
    if (percentage >= 80) return 'Very Good'
    if (percentage >= 70) return 'Good'
    if (percentage >= 60) return 'Satisfactory'
    if (percentage >= 50) return 'Fair'
    if (percentage >= 40) return 'Pass'
    return 'Fail'
  }

  const calculateStats = () => {
    if (!results || results.length === 0) return { total: '0', average: '0', aggregate: 0, division: '' }
    let total = 0
    let count = 0
    let aggregate = 0
    
    results.forEach((r: any) => {
      const subjectTotal = r.raw_marks?.total || 0
      const grade = r.final_grade || ''
      
      if (subjectTotal > 0) {
        total += subjectTotal
        count++
        
        // Calculate aggregate based on grade (D1=1, D2=2, etc.)
        switch (grade) {
          case 'D1': aggregate += 1; break
          case 'D2': aggregate += 2; break
          case 'C3': aggregate += 3; break
          case 'C4': aggregate += 4; break
          case 'C5': aggregate += 5; break
          case 'C6': aggregate += 6; break
          case 'P7': aggregate += 7; break
          case 'P8': aggregate += 8; break
          case 'F9': aggregate += 9; break
          default: aggregate += 9; break // Treat missing/invalid grades as F9
        }
      }
    })
    
    const average = count > 0 ? total / count : 0
    let division = ''
    if (count > 0) {
      if (aggregate >= 4 && aggregate <= 12) division = 'I'
      else if (aggregate >= 13 && aggregate <= 23) division = 'II'
      else if (aggregate >= 24 && aggregate <= 29) division = 'III'
      else if (aggregate >= 30 && aggregate <= 34) division = 'IV'
      else division = 'U'
    }
    
    return { total: total.toFixed(1), average: average.toFixed(1), aggregate, division }
  }

  const stats = calculateStats()
  const position = results?.[0]?.position || 'N/A'

  return (
    <div className={`report-card bg-white mx-auto`} style={{ width: '210mm', height: '297mm', padding: '8mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', pageBreakAfter: pageBreak ? 'always' : 'auto' }} data-print-item="true">
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
              <p style={{ fontSize: '13px', fontWeight: '700', margin: 0, textTransform: 'uppercase' }}>PRIMARY REPORT</p>
              <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: '#000' }}>{year} • {term}</p>
              <p style={{ fontSize: '9px', margin: '1px 0 0 0', color: '#000' }}>{examType}</p>
            </div>
          </div>
          {student?.photo_url ? (
            <ImageWithFallback 
              src={student.photo_url}
              alt="Student Photo"
              className="object-cover rounded border-3 border-black"
              style={{ height: '60px', width: '60px' }}
              fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 24 24' fill='%23f3f4f6'%3E%3Cpath d='M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z' fill='%239CA3AF'/%3E%3Cpath d='M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z' fill='%239CA3AF'/%3E%3C/svg%3E"
            />
          ) : (
            <div style={{ height: '60px', width: '60px', background: '#f3f4f6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #000' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#9CA3AF"/>
                <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="#9CA3AF"/>
              </svg>
            </div>
          )}
        </div>

        {/* Student Information Bar */}
        <div style={{ background: '#f8fafc', padding: '8px 20px', borderBottom: '2px solid #000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Student Name</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '12px', color: '#1e293b' }}>
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Admission No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.admission_no}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.class_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '9px', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '11px' }}>{student.gender}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '12px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance */}
          <div style={{ marginBottom: '10px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', marginBottom: '8px', flex: 1 }}>
              <thead>
                <tr style={{ background: 'white', color: '#000' }}>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'left', fontWeight: '700', fontSize: '11px' }}>SUBJECT</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '60px', fontSize: '11px' }}>CA (40)</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '60px', fontSize: '11px' }}>EXAM (60)</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '60px', fontSize: '11px' }}>TOTAL (100)</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '50px', fontSize: '11px' }}>GRADE</th>
                  <th style={{ border: '2px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: '700', width: '80px', fontSize: '11px' }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject: any, index: number) => {
                  const result = results?.find((r: any) => r.subject_id === subject.id)
                  const ca = result?.raw_marks?.ca || 0
                  const exam = result?.raw_marks?.exam || 0
                  const total = result?.raw_marks?.total || (ca + exam)
                  const hasMarks = ca > 0 || exam > 0
                  const grade = result?.final_grade || ''
                  const remark = hasMarks ? getGradeComment(total) : ''
                  
                  return (
                    <tr key={subject.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #000', padding: '5px', fontWeight: '600', color: '#000', fontSize: '10px' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '10px' }}>{ca || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '10px' }}>{exam || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#000' }}>{hasMarks ? total.toFixed(1) : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontWeight: '700', fontSize: '11px', color: '#000' }}>{grade}</td>
                      <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', color: '#000' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '6px', border: '1px solid #000', borderRadius: '3px', marginBottom: '8px' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>Primary Grading Scale</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', fontSize: '8px', marginBottom: '3px' }}>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>D1:</strong> 90-100</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>D2:</strong> 80-89</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>C3:</strong> 70-79</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>C4:</strong> 60-69</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>C5:</strong> 55-59</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', fontSize: '8px' }}>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>C6:</strong> 50-54</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>P7:</strong> 45-49</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>P8:</strong> 40-44</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px', fontWeight: '600' }}><strong>F9:</strong> 0-39</span>
              </div>
            </div>
          </div>

          {/* Performance Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
            <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '1px solid #000', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', color: '#000' }}>Total Marks</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{stats.total}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '1px solid #000', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', color: '#000' }}>Average</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{stats.average}%</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '1px solid #000', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', color: '#000' }}>Position</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{position}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '1px solid #000', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', color: '#000' }}>Aggregate</p>
              <p style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: '#000' }}>{stats.aggregate}</p>
            </div>
            <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '2px solid #000', borderRadius: '3px' }}>
              <p style={{ margin: '0 0 2px 0', fontSize: '8px', fontWeight: '600', textTransform: 'uppercase', color: '#000' }}>Division</p>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '700', letterSpacing: '1px', color: '#000' }}>{stats.division || '-'}</p>
            </div>
          </div>

          {/* Comments and Additional Information */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            
            {/* Left: Teacher Comments */}
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '3px' }}>
                Teacher Comments
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '12px', border: '2px solid #000', borderRadius: '4px', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                <p style={{ fontSize: '10px', margin: '0 0 12px 0', lineHeight: '1.4', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Outstanding performance! Excellent work across all subjects.' :
                   parseFloat(stats.average) >= 65 ? 'Very good progress shown. Keep up the excellent effort.' :
                   parseFloat(stats.average) >= 50 ? 'Good effort demonstrated. Continue working hard to improve.' :
                   'Needs more support and dedication to achieve better results.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '6px' }}>
                  <p style={{ fontSize: '8px', margin: '0 0 3px 0', color: '#000' }}>Signature</p>
                  <p style={{ fontSize: '10px', margin: 0, fontWeight: '600' }}>_________________</p>
                </div>
              </div>
              
              <div style={{ background: '#f8fafc', padding: '12px', border: '2px solid #000', borderRadius: '4px' }}>
                <p style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                <p style={{ fontSize: '10px', margin: '0 0 12px 0', lineHeight: '1.4', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Exemplary achievement! Well done and keep it up.' :
                   parseFloat(stats.average) >= 65 ? 'Commendable performance. Continue the good work.' :
                   parseFloat(stats.average) >= 50 ? 'Satisfactory progress. More effort needed for excellence.' :
                   'Immediate intervention and support required for improvement.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '6px' }}>
                  <p style={{ fontSize: '8px', margin: '0 0 3px 0', color: '#000' }}>Signature & School Stamp</p>
                  <p style={{ fontSize: '10px', margin: 0, fontWeight: '600' }}>_________________</p>
                </div>
              </div>
            </div>

            {/* Right: Fees Information */}
            <div>
              <h3 style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 5px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px' }}>
                Financial Information
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '8px', border: '1px solid #000', borderRadius: '3px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000' }}>Fees Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontSize: '9px', color: '#000' }}>Outstanding:</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: '#000' }}>
                    UGX {outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                {outstandingBalance > 0 && (
                  <p style={{ fontSize: '8px', margin: '3px 0 0 0', color: '#000', fontStyle: 'italic' }}>
                    Please clear outstanding fees.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '10px', border: '2px solid #000', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
              <div>
                <p style={{ margin: '0 0 3px 0', fontWeight: '700', color: '#000' }}>Next Term Information</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opens:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '___________'} • 
                  <strong> Closes:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '___________'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '9px', fontStyle: 'italic', color: '#000' }}>
                  Official School Document
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '8px', color: '#000' }}>
                  Alteration Prohibited
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'white', color: '#000', padding: '10px 20px', textAlign: 'center', fontSize: '9px', borderTop: '3px solid #000' }}>
          <p style={{ margin: 0, fontWeight: '600' }}>
            © {year} {school?.name} • Empowering Excellence in Education • Building Tomorrow's Leaders
          </p>
        </div>
      </div>
    </div>
  )
}
