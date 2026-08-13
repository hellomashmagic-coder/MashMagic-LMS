import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Bell, 
  Clock, 
  Trash2, 
  CheckCircle2, 
  ShieldAlert, 
  Activity,
  Loader2,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { premiumConfirm } from '../../utils/premiumConfirm';
import Pagination from '../../components/common/Pagination';

const MentorHeadNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 50;
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [page]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await axios.get('/api/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit }
      });
      if (res.data.success) {
        setNotifications(res.data.data || []);
        setTotalRecords(res.data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.put(`/api/admin/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      toast.error("Failed to update notification");
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = sessionStorage.getItem('token');
      await axios.delete(`/api/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success("Notification removed");
    } catch (error) {
      toast.error("Failed to delete notification");
    }
  };

  const clearAllNotifications = async () => {
    premiumConfirm(async () => {
      try {
        const token = sessionStorage.getItem('token');
        const res = await axios.delete('/api/admin/notifications/clear-all', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
          setNotifications([]);
          toast.success("All notifications cleared");
        }
      } catch (error) {
        console.error('Error clearing notifications:', error);
        toast.error("Failed to clear notifications");
      }
    }, {
      title: 'Clear Notifications',
      message: 'Are you sure you want to clear all notifications? This action will hide all alerts from your view.',
      type: 'warning'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-[#008080] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white p-5 md:p-10 rounded-[3rem] border border-slate-100 shadow-sm flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-4">
            <Bell className="text-[#008080]" size={32} />
            System Notifications
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            Real-time alerts for student registrations, mentorship reports, and system flags
          </p>
        </div>
        <div className="flex items-center gap-4">
          {notifications.length > 0 && (
            <button 
              onClick={clearAllNotifications}
              className="flex items-center gap-2 px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all border border-rose-100"
            >
              <Trash2 size={16} />
              Clear All
            </button>
          )}
          <button 
            onClick={fetchNotifications}
            className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:bg-[#008080]/10 hover:text-[#008080] transition-all"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {notifications.length > 0 ? (
          notifications.map((n) => (
            <div 
              key={n.id} 
              className={`group bg-white p-6 rounded-[2rem] border transition-all duration-500 flex items-start gap-6 ${
                n.is_read ? 'border-slate-100 opacity-75' : 'border-[#008080]/20 shadow-lg shadow-[#008080]/5 bg-gradient-to-r from-white to-[#008080]/5'
              }`}
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${
                n.action_type?.includes('fraud') || n.action_type?.includes('risk') ? 'bg-rose-50 text-rose-500' :
                n.action_type?.includes('report') ? 'bg-emerald-50 text-emerald-500' :
                'bg-[#008080]/10 text-[#008080]'
              }`}>
                {n.action_type?.includes('fraud') ? <ShieldAlert size={24} /> :
                 n.action_type?.includes('report') ? <Activity size={24} /> :
                 <Info size={24} />}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                      {n.action_type?.split('_').join(' ') || 'System Alert'}
                    </span>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#008080] animate-pulse"></span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p 
                  className="text-slate-700 font-medium leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: n.message }}
                />
              </div>

              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!n.is_read && (
                  <button 
                    onClick={() => markAsRead(n.id)}
                    className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                    title="Mark as Read"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button 
                  onClick={() => deleteNotification(n.id)}
                  className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-slate-200">
            <Bell size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">All caught up!</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">No new notifications at the moment</p>
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className="bg-white p-4 md:p-6 rounded-[2rem] border border-slate-100 mt-6 shadow-sm">
          <Pagination 
            currentPage={page} 
            totalPages={Math.ceil(totalRecords / limit) || 1} 
            totalRecords={totalRecords} 
            onPageChange={setPage} 
          />
        </div>
      )}
    </div>
  );
};

export default MentorHeadNotifications;
