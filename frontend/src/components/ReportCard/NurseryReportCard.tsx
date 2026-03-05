'use client'

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
    <div className={`report-card bg-white mx-auto ${pageBreak ? 'page-break' : ''}`} style={{ width: '210mm', height: '297mm', padding: '10mm', boxSizing: 'border-box', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ display: 'flex', flexDirection: 'column', border: '3px solid #000', height: '100%', overflow: 'hidden' }}>
        
        {/* Header Section */}
        <div style={{ background: 'white', color: '#000', padding: '15px 20px', display: 'flex', alignItems: 'center', gap: '15px', borderBottom: '2px solid #000' }}>
          {school?.logo_url && (
            <img src={school.logo_url.startsWith('http') ? school.logo_url : `http://localhost:8080${school.logo_url}`} alt="Logo" style={{ height: '55px', width: '55px', objectFit: 'contain', background: 'white', borderRadius: '6px', padding: '6px' }} />
          )}
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '18px', fontWeight: '700', margin: '0 0 3px 0', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
              {school?.name}
            </h1>
            <p style={{ fontSize: '9px', margin: '0 0 2px 0', fontStyle: 'italic', opacity: 0.95 }}>
              {school?.motto}
            </p>
            <p style={{ fontSize: '8px', margin: 0, opacity: 0.85 }}>
              {school?.address} • {school?.phone} • {school?.contact_email}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'white', color: '#000', padding: '8px 14px', borderRadius: '5px', border: '2px solid #000' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', margin: 0 }}>NURSERY REPORT</p>
              <p style={{ fontSize: '8px', margin: '2px 0 0 0' }}>{year} • {term}</p>
              <p style={{ fontSize: '7px', margin: '1px 0 0 0', color: '#000' }}>{examType}</p>
            </div>
          </div>
        </div>

        {/* Student Information Bar */}
        <div style={{ background: '#f8fafc', padding: '10px 20px', borderBottom: '3px solid #000' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '15px', fontSize: '9px' }}>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '7px', textTransform: 'uppercase', fontWeight: '600' }}>Student Name</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '10px', color: '#1e293b' }}>
                {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '7px', textTransform: 'uppercase', fontWeight: '600' }}>Admission No</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '9px' }}>{student.admission_no}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '7px', textTransform: 'uppercase', fontWeight: '600' }}>Class</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '9px' }}>{student.class_name}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 2px 0', color: '#64748b', fontSize: '7px', textTransform: 'uppercase', fontWeight: '600' }}>Gender</p>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '9px' }}>{student.gender}</p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Academic Performance */}
          <div style={{ marginBottom: '15px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: '700', margin: '0 0 10px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '5px', textAlign: 'center' }}>
              Academic Performance
            </h2>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', marginBottom: '15px' }}>
              <thead>
                <tr style={{ background: 'white', color: '#000' }}>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'left', fontWeight: '600' }}>LEARNING AREA</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '70px' }}>CA (100)</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '70px' }}>EXAM (100)</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '60px' }}>AVG</th>
                  <th style={{ border: '1px solid #000', padding: '8px 6px', textAlign: 'center', fontWeight: '600', width: '100px' }}>REMARK</th>
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
                      <td style={{ border: '1px solid #000', padding: '7px 6px', fontWeight: '600', color: '#000' }}>{subject.name}</td>
                      <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center' }}>{ca || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center' }}>{exam || ''}</td>
                      <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', fontWeight: '700', color: '#000' }}>{avg}</td>
                      <td style={{ border: '1px solid #000', padding: '7px 6px', textAlign: 'center', fontSize: '9px', fontStyle: 'italic', color: '#000' }}>{remark}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Grading Scale */}
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', border: '1px solid #000' }}>
              <p style={{ fontSize: '10px', fontWeight: '700', margin: '0 0 6px 0', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>Grading Scale</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', fontSize: '8px' }}>
                <span style={{ background: 'white', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>Mastering:</strong> 90-100</span>
                <span style={{ background: 'white', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>Secure:</strong> 75-89</span>
                <span style={{ background: 'white', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>Developing:</strong> 60-74</span>
                <span style={{ background: 'white', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>Emerging:</strong> 40-59</span>
                <span style={{ background: 'white', padding: '4px', textAlign: 'center', border: '1px solid #000', borderRadius: '2px' }}><strong>Not Yet:</strong> 0-39</span>
              </div>
              <p style={{ fontSize: '8px', margin: '4px 0 0 0', textAlign: 'center', fontStyle: 'italic' }}>Average = (CA + Exam) / 2</p>
            </div>
          </div>

          {/* Summary and Comments Section */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', flex: 1 }}>
            
            {/* Left: Performance Summary */}
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px' }}>
                Performance Summary
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', textAlign: 'center', border: '2px solid #000', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 3px 0', fontSize: '8px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Total Marks</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000' }}>{stats.total}</p>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', textAlign: 'center', border: '2px solid #000', borderRadius: '4px' }}>
                  <p style={{ margin: '0 0 3px 0', fontSize: '8px', color: '#000', textTransform: 'uppercase', fontWeight: '600' }}>Average %</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#000' }}>{stats.average}%</p>
                </div>
              </div>
            </div>

            {/* Right: Comments and Fees */}
            <div>
              <h3 style={{ fontSize: '11px', fontWeight: '700', margin: '0 0 8px 0', color: '#000', textTransform: 'uppercase', borderBottom: '2px solid #000', paddingBottom: '4px' }}>
                Teacher Comments
              </h3>
              
              <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #000', borderRadius: '4px', marginBottom: '10px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#000' }}>Class Teacher</p>
                <p style={{ fontSize: '9px', margin: '0 0 15px 0', lineHeight: '1.5', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Excellent performance! Keep up the outstanding work.' :
                   parseFloat(stats.average) >= 65 ? 'Very good performance. Continue working hard.' :
                   parseFloat(stats.average) >= 50 ? 'Good effort. There is room for improvement.' :
                   parseFloat(stats.average) >= 35 ? 'Fair performance. More effort is needed.' :
                   'Needs significant improvement. Extra support recommended.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '7px', margin: '0 0 2px 0', color: '#000' }}>Teacher Name</p>
                    <p style={{ fontSize: '8px', margin: 0, fontWeight: '600' }}>_______________</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '7px', margin: '0 0 2px 0', color: '#000' }}>Signature</p>
                    <p style={{ fontSize: '8px', margin: 0, fontWeight: '600' }}>_______________</p>
                  </div>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', border: '1px solid #000', borderRadius: '4px', marginBottom: '10px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#000' }}>Headteacher</p>
                <p style={{ fontSize: '9px', margin: '0 0 15px 0', lineHeight: '1.5', color: '#000' }}>
                  {parseFloat(stats.average) >= 80 ? 'Outstanding achievement! Exemplary student.' :
                   parseFloat(stats.average) >= 65 ? 'Commendable performance. Well done!' :
                   parseFloat(stats.average) >= 50 ? 'Satisfactory progress. Keep improving.' :
                   parseFloat(stats.average) >= 35 ? 'Requires more dedication and focus.' :
                   'Immediate intervention required. Arrange parent meeting.'}
                </p>
                <div style={{ borderTop: '1px solid #000', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: '7px', margin: '0 0 2px 0', color: '#000' }}>Principal Name</p>
                    <p style={{ fontSize: '8px', margin: 0, fontWeight: '600' }}>_______________</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '7px', margin: '0 0 2px 0', color: '#000' }}>Signature & Stamp</p>
                    <p style={{ fontSize: '8px', margin: 0, fontWeight: '600' }}>_______________</p>
                  </div>
                </div>
              </div>

              {/* Fees */}
              <div style={{ background: '#f8fafc', padding: '10px', border: '2px solid #000', borderRadius: '4px' }}>
                <p style={{ fontSize: '9px', fontWeight: '700', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#000' }}>Fees Status</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#000' }}>Outstanding Balance:</span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#000' }}>
                    UGX {outstandingBalance?.toLocaleString() || '0'}
                  </span>
                </div>
                {outstandingBalance > 0 && (
                  <p style={{ fontSize: '7px', margin: '5px 0 0 0', color: '#000', fontStyle: 'italic' }}>
                    Please clear outstanding fees to receive next term's report card.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer Information */}
          <div style={{ background: '#f8fafc', padding: '12px', border: '1px solid #000', borderRadius: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px' }}>
              <div>
                <p style={{ margin: '0 0 2px 0', fontWeight: '700', color: '#000' }}>Next Term Dates</p>
                <p style={{ margin: 0, color: '#000' }}>
                  <strong>Opening:</strong> {nextTermBegins ? new Date(nextTermBegins).toLocaleDateString('en-GB') : '___________'} • 
                  <strong> Closing:</strong> {nextTermEnds ? new Date(nextTermEnds).toLocaleDateString('en-GB') : '___________'}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: '6px', fontStyle: 'italic', color: '#000' }}>
                  This is an official academic document. Any unauthorized alteration is strictly prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: 'white', color: '#000', padding: '10px 20px', textAlign: 'center', fontSize: '8px', borderTop: '2px solid #000' }}>
          <p style={{ margin: 0, opacity: 0.9 }}>
            © {year} {school?.name} • Empowering Excellence in Education
          </p>
        </div>
      </div>
    </div>
  )
}
