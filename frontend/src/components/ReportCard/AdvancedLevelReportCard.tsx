'use client'

import ImageWithFallback from '@/components/ui/ImageWithFallback'

interface AdvancedLevelReportCardProps {
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

export default function AdvancedLevelReportCard({
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
}: AdvancedLevelReportCardProps) {

  const getGradeComment = (grade: string) => {
    if (grade === 'A') return 'Excellent'
    if (grade === 'B') return 'Very Good'
    if (grade === 'C') return 'Good'
    if (grade === 'D') return 'Satisfactory'
    if (grade === 'E') return 'Fair'
    if (grade === 'O') return 'Pass'
    return 'Fail'
  }

  const calculateTotalPoints = () => {
    let totalPoints = 0
    
    subjects?.forEach((subject: any) => {
      const result = results?.find((r: any) => r.subject_id === subject.id)
      const grade = result?.final_grade?.trim()
      
      // Check if subsidiary subject (ICT or General Paper)
      const isSubsidiary = subject.name?.toLowerCase().includes('ict') || 
                          subject.name?.toLowerCase().includes('general paper') ||
                          subject.name?.toLowerCase().includes('subsidiary')
      
      if (grade) {
        if (isSubsidiary) {
          // Subsidiary subjects: O=1, F=0
          if (grade === 'O') totalPoints += 1
        } else {
          // Main subjects: A=6, B=5, C=4, D=3, E=2, F=0
          if (grade === 'A') totalPoints += 6
          else if (grade === 'B') totalPoints += 5
          else if (grade === 'C') totalPoints += 4
          else if (grade === 'D') totalPoints += 3
          else if (grade === 'E') totalPoints += 2
          // F = 0 points (no addition needed)
        }
      }
    })
    
    return totalPoints
  }

  const totalPoints = calculateTotalPoints()

  return (
    <div className={`report-card bg-white mx-auto`} style={{ width: '210mm', height: '297mm', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif', pageBreakAfter: pageBreak ? 'always' : 'auto' }} data-print-item="true">
      <div style={{ display: 'flex', flexDirection: 'column', border: '3px solid #000', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ background: 'white', color: '#000', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '2px solid #000' }}>
          {school?.logo_url && (
            <ImageWithFallback 
              src={school.logo_url} 
              alt="School Logo" 
              className="object-contain bg-white rounded border-2 border-black p-1"
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
            <div style={{ background: 'white', color: '#000', padding: '8px 14px', borderRadius: '4px', border: '2px solid #000' }}>
              <p style={{ fontSize: '12px', fontWeight: '700', margin: 0 }}>UACE REPORT</p>
              <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>{year} • {term}</p>
              <p style={{ fontSize: '9px', margin: '2px 0 0 0', color: '#000' }}>{examType}</p>
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '12px', fontSize: '11px' }}>
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
        <div style={{ padding: '12px 18px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance */}
          <div style={{ marginBottom: '8px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '14px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px', textAlign: 'center' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '8px', flex: 1 }}>
              <thead>
                <tr style={{ background: 'white', color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'left', fontWeight: '600' }}>SUBJECT</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>P1</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>P2</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>P3</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '50px' }}>GRADE</th>
                  <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: '600', width: '85px' }}>REMARK</th>
                </tr>
              </thead>
              <tbody>
                {subjects?.map((subject: any, index: number) => {
                  // Get all paper results for this subject
                  const subjectResults = results?.filter((r: any) => r.subject_id === subject.id) || []
                  
                  // Check if subsidiary subject (ICT or General Paper)
                  const isSubsidiary = subject.name?.toLowerCase().includes('ict') || 
                                      subject.name?.toLowerCase().includes('general paper') ||
                                      subject.name?.toLowerCase().includes('subsidiary')
                  
                  // Extract marks for each paper - check paper column
                  const paper1 = subjectResults.find((r: any) => r.paper === 1)
                  const paper2 = subjectResults.find((r: any) => r.paper === 2)
                  const paper3 = subjectResults.find((r: any) => r.paper === 3)
                  
                  // Calculate marks - check mark, total, or ca+exam
                  const p1 = paper1?.raw_marks ? (paper1.raw_marks.mark || paper1.raw_marks.total || ((paper1.raw_marks.ca || 0) + (paper1.raw_marks.exam || 0))) : 0
                  const p2 = paper2?.raw_marks ? (paper2.raw_marks.mark || paper2.raw_marks.total || ((paper2.raw_marks.ca || 0) + (paper2.raw_marks.exam || 0))) : 0
                  const p3 = paper3?.raw_marks ? (paper3.raw_marks.mark || paper3.raw_marks.total || ((paper3.raw_marks.ca || 0) + (paper3.raw_marks.exam || 0))) : 0
                  
                  // Get grade from any result that has it
                  let grade = ''
                  for (const result of subjectResults) {
                    if (result?.final_grade?.trim()) {
                      grade = result.final_grade.trim()
                      break
                    }
                  }
                  
                  // For subsidiary subjects, override grade based on marks
                  if (isSubsidiary && p1 > 0) {
                    grade = p1 >= 50 ? 'O' : 'F'
                  }
                  
                  const hasMarks = p1 > 0 || p2 > 0 || p3 > 0
                  const remark = grade ? getGradeComment(grade) : ''
                  
                  return (
                    <tr key={subject.id} style={{ background: index % 2 === 0 ? 'white' : '#f8fafc' }}>
                      <td style={{ border: '1px solid #000', padding: '4px', fontWeight: '600', color: '#000' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{p1 > 0 ? p1 : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{!isSubsidiary && p2 > 0 ? p2 : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{!isSubsidiary && p3 > 0 ? p3 : ''}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: '700' }}>{grade}</td>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', color: '#000' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '6px', borderRadius: '3px', border: '1px solid #000' }}>
              <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 4px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>UACE Grading Scale</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '3px', fontSize: '8px', marginBottom: '3px' }}>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>D1:</strong> 85-100</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>D2:</strong> 80-84</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C3:</strong> 75-79</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C4:</strong> 70-74</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C5:</strong> 65-69</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', fontSize: '8px' }}>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>C6:</strong> 60-64</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>P7:</strong> 50-59</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>P8:</strong> 40-49</span>
                <span style={{ background: 'white', padding: '2px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>F9:</strong> 0-39</span>
              </div>
            </div>
          </div>

          {/* Summary and Comments Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '6px', marginBottom: '5px' }}>
            
            {/* Left: Performance Summary */}
            <div>
              <h3 style={{ fontSize: '8px', fontWeight: '700', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
                Performance Summary
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '6px', textAlign: 'center', border: '2px solid #000', borderRadius: '3px', marginBottom: '4px' }}>
                <p style={{ margin: '0 0 2px 0', fontSize: '7px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Total Points</p>
                <p style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#000' }}>{totalPoints} / 20</p>
              </div>
            </div>

            {/* Right: Comments and Fees */}
            <div>
              <h3 style={{ fontSize: '8px', fontWeight: '700', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '2px' }}>
                Teacher Comments
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', marginBottom: '5px' }}>
                <div style={{ background: '#f8fafc', padding: '5px', border: '1px solid #000', borderRadius: '3px' }}>
                  <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                  <p style={{ fontSize: '7px', margin: '0 0 4px 0', lineHeight: '1.2', color: '#000' }}>
                    {totalPoints >= 18 ? 'Outstanding performance! Excellent work.' : totalPoints >= 14 ? 'Very good performance. Keep it up.' : totalPoints >= 10 ? 'Good effort. Continue working hard.' : totalPoints >= 6 ? 'Fair performance. More effort needed.' : 'Needs significant improvement.'}
                  </p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px' }}>
                    <p style={{ fontSize: '6px', margin: 0, color: '#000' }}>Sign: __________</p>
                  </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '5px', border: '1px solid #000', borderRadius: '3px' }}>
                  <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                  <p style={{ fontSize: '7px', margin: '0 0 4px 0', lineHeight: '1.2', color: '#000' }}>
                    {totalPoints >= 18 ? 'Exemplary achievement! Well done.' : totalPoints >= 14 ? 'Commendable performance.' : totalPoints >= 10 ? 'Satisfactory progress.' : totalPoints >= 6 ? 'Requires more dedication.' : 'Immediate intervention required.'}
                  </p>
                  <div style={{ borderTop: '1px solid #000', paddingTop: '2px' }}>
                    <p style={{ fontSize: '6px', margin: 0, color: '#000' }}>Sign & Stamp: __________</p>
                  </div>
                </div>
              </div>

              {/* Fees */}
              <div style={{ background: '#f8fafc', padding: '5px', border: '2px solid #000', borderRadius: '3px' }}>
                <p style={{ fontSize: '7px', fontWeight: '700', margin: '0 0 2px 0', textTransform: 'uppercase', color: '#000' }}>Fees Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '7px', color: '#000' }}>Outstanding:</span>
                  <span style={{ fontSize: '9px', fontWeight: '700', color: '#000' }}>
                    UGX {outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                {outstandingBalance > 0 && (
                  <p style={{ fontSize: '6px', margin: '2px 0 0 0', color: '#000', fontStyle: 'italic' }}>
                    Please clear outstanding fees.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '5px 8px', border: '1px solid #000', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '7px' }}>
              <div>
                <p style={{ margin: '0 0 1px 0', fontWeight: '700', color: '#000' }}>Next Term Dates</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opens:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '___________'} • 
                  <strong> Closes:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '___________'}
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
        <div style={{ background: 'white', color: '#000', padding: '6px 20px', textAlign: 'center', fontSize: '6px', borderTop: '2px solid #000' }}>
          <p style={{ margin: 0 }}>
            © {year} {school?.name} • Empowering Excellence in Education • Building Tomorrow's Leaders
          </p>
        </div>
      </div>
    </div>
  )
}
