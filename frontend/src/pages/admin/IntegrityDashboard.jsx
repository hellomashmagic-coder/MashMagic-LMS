import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const IntegrityDashboard = () => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/admin/integrity-report`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setReport(res.data.data);
            }
        } catch (error) {
            toast.error("Failed to fetch integrity report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (loading) return <div className="p-4 md:p-8 text-center text-gray-500">Loading integrity scan...</div>;

    if (!report) return <div className="p-4 md:p-8 text-center text-gray-500">No report available. The scan may not have run yet.</div>;

    const { summary, missing_timetables, orphan_sessions } = report;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">System Integrity Dashboard</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Last Scanned: {new Date(report.last_scanned).toLocaleString()}
                    </p>
                </div>
                <button 
                    onClick={fetchReport}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
                >
                    Refresh Data
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className={`p-4 rounded-xl shadow-sm border ${summary.status === 'HEALTHY' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <h3 className="text-sm font-semibold text-gray-600 uppercase">System Status</h3>
                    <p className={`text-2xl font-bold mt-1 ${summary.status === 'HEALTHY' ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.status}
                    </p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase">Active Students</h3>
                    <p className="text-2xl font-bold text-gray-800 mt-1">{summary.total_active_students}</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase">Missing Timetables</h3>
                    <p className="text-2xl font-bold text-red-500 mt-1">{summary.missing_timetables_count}</p>
                </div>
                <div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-600 uppercase">Orphan Sessions</h3>
                    <p className="text-2xl font-bold text-orange-500 mt-1">{summary.orphan_sessions_count}</p>
                </div>
            </div>

            {/* Missing Timetables Section */}
            <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Missing Timetables (Active Students)
                </h2>
                {missing_timetables.length === 0 ? (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                        All active students have timetable records.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700">ID</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Grade</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Course</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {missing_timetables.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">#{student.id}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{student.name}</td>
                                        <td className="px-4 py-3 text-gray-600">{student.grade}</td>
                                        <td className="px-4 py-3 text-gray-600">{student.course}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Orphan Sessions Section */}
            <div>
                <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    Orphan Faculty Sessions
                </h2>
                {orphan_sessions.length === 0 ? (
                    <div className="p-4 bg-green-50 text-green-700 rounded-lg border border-green-200 text-sm">
                        No orphan sessions found.
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Session ID</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Faculty ID</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Topic</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {orphan_sessions.map(session => (
                                    <tr key={session.session_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-600">#{session.session_id}</td>
                                        <td className="px-4 py-3 text-gray-600">#{session.faculty_id}</td>
                                        <td className="px-4 py-3 text-gray-600">{session.topic}</td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {session.date ? new Date(session.date).toLocaleDateString() : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

        </div>
    );
};

export default IntegrityDashboard;
