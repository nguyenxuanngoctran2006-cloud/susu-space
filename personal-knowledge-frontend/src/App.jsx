import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

const API_URL = 'https://susu-space.onrender.com/api';

function App() {
  const [authOtp, setAuthOtp] = useState('')
  const [authNewPassword, setAuthNewPassword] = useState('')
  const [isResetMode, setIsResetMode] = useState(false);

  // --- STATE QUẢN LÝ XÁC THỰC (AUTH) ---
  const [token, setToken] = useState(localStorage.getItem('susu_token') || null)
  const [userEmail, setUserEmail] = useState(localStorage.getItem('susu_email') || '')
  const [isAuthMode, setIsAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  // --- STATE ỨNG DỤNG GỐC ---
  const [folders, setFolders] = useState([])
  const [notes, setNotes] = useState([])     
  const [selectedFolderId, setSelectedFolderId] = useState(null) 
  const [title, setTitle] = useState('')     
  const [content, setContent] = useState('') 
  const [searchKeyword, setSearchKeyword] = useState('')
  const [hoveredFolderId, setHoveredFolderId] = useState(null)
  const [selectedNoteIds, setSelectedNoteIds] = useState([])
  const [isMultiSelectFoldersMode, setIsMultiSelectFoldersMode] = useState(false)
  const [selectedFolderIds, setSelectedFolderIds] = useState([])
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [pinnedNoteIds, setPinnedNoteIds] = useState([])

  // --- STATE PHỤ TRỢ DI ĐỘNG (MOBILE) ---
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    // Kiểm tra xem trên thanh địa chỉ có chứa access_token của Supabase gửi về không
    const hash = window.location.hash;
    if (hash && hash.includes('access_token=')) {
      alert("🔮 Hệ thống nhận diện link cứu hộ thành công! Mời bạn nhập mật khẩu mới nhé.");
      setIsResetMode(true); // Bật giao diện nhập mật khẩu mới lên
    }
  }, []);

  // Hàm gọi API cập nhật mật khẩu mới lên Backend
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    try {
      // Bóc tách access_token từ thanh địa chỉ để làm chìa khóa xác thực với Supabase
      const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));
      const accessToken = hashParams.get('access_token');

      if (!accessToken) return alert("❌ Link hết hạn hoặc không hợp lệ rồi bạn ơi!");

      const res = await axios.post('https://susu-space.onrender.com/api/auth/update-password', 
        { password: authPassword },
        { headers: { Authorization: `Bearer ${accessToken}` } } // Gửi kèm token cứu hộ
      );

      alert(`🎉 ${res.data.message}`);
      setIsResetMode(false);
      setIsAuthMode('login');
      window.location.hash = ''; // Xóa sạch token trên URL cho sạch sẽ
      setAuthPassword('');
    } catch (error) {
      alert(`❌ Thất bại: ${error.response?.data?.error || error.message}`);
    }
  };
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    };
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${token}` }
  })

  useEffect(() => {
    if (token) {
      fetchFolders()
      fetchNotes() 
    }
  }, [token])

  useEffect(() => {
    setSelectedNoteIds([]);
    handleCancelEdit(); 
    if (isMobile) setIsMobileMenuOpen(false);
  }, [selectedFolderId])

  const handleAuth = async (e) => {
    e.preventDefault()
    if (!authEmail.trim() || !authPassword.trim()) {
      alert("🧸 Điền đầy đủ tài khoản mật khẩu phát bạn ơi!")
      return
    }

    try {
      if (isAuthMode === 'login') {
        const response = await axios.post(`${API_URL}/auth/login`, { email: authEmail, password: authPassword })
        const { token: receivedToken, user } = response.data
        localStorage.setItem('susu_token', receivedToken)
        localStorage.setItem('susu_email', user.email)
        setToken(receivedToken)
        setUserEmail(user.email)
        alert("🎉 Đăng nhập thành công! Chào mừng tới trạm sáng tạo của bạn!")
      } else {
        await axios.post(`${API_URL}/auth/register`, { email: authEmail, password: authPassword })
        alert("✨ Đăng ký tài khoản thành công! Hãy chuyển sang Đăng nhập ngay nào!")
        setIsAuthMode('login')
      }
      setAuthPassword('')
    } catch (error) {
      alert(`❌ Thất bại: ${error.response?.data?.error || "Lỗi kết nối mạng rồi!"}`)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      if (!authEmail.trim()) return alert("🧸 Nhập email phát bạn ơi!");
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email: authEmail });
      alert("🎉 Supabase đã gửi link khôi phục! Bạn hãy kiểm tra hòm thư (hoặc hộp thư Spam) liền nha!");
      setIsAuthMode('login'); 
    } catch (error) {
      const serverError = error.response?.data?.error;
      const errorMsg = typeof serverError === 'object' ? (serverError.message || JSON.stringify(serverError)) : serverError;
      alert(`❌ Lỗi: ${errorMsg || error.message || "Gặp sự cố rồi!"}`);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('susu_token')
    localStorage.removeItem('susu_email')
    setToken(null)
    setUserEmail('')
    setFolders([])
    setNotes([])
    setSelectedFolderId(null)
  }

  const fetchFolders = async () => {
    try {
      const response = await axios.get(`${API_URL}/folders`, getAuthHeader())
      setFolders(response.data)
    } catch (error) {
      console.error("❌ Lỗi lấy thư mục:", error)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`${API_URL}/notes`, getAuthHeader())
      setNotes(response.data) 
    } catch (error) {
      console.error("❌ Lỗi lấy ghi chú:", error)
    }
  }

  const handleAddFolder = async () => {
    const folderName = prompt("🎨 Đặt tên cho thư mục rực rỡ mới nào:")
    if (!folderName || !folderName.trim()) return

    try {
      await axios.post(`${API_URL}/folders`, { name: folderName }, getAuthHeader())
      alert(`✨ Tạo không gian [${folderName}] thành công rồi nè bạn ơi!`);
      fetchFolders()
    } catch (error) {
      alert("❌ Tạo thất bại rồi!")
    }
  }

  const handleDeleteFolder = async (e, folderId, folderName) => {
    e.stopPropagation();
    const confirmDelete = window.confirm(`🗑️ CẢNH BÁO: Bạn có chắc muốn xóa không gian "${folderName}" này không?\n\n⚠️ Toàn bộ ghi chú nằm bên trong cũng sẽ bay màu theo đó nha!`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/folders/${folderId}`, getAuthHeader());
      alert(`🎉 Đã dọn dẹp sạch sẽ không gian [${folderName}] rồi nhé!`);
      if (Number(selectedFolderId) === Number(folderId)) setSelectedFolderId(null);
      fetchFolders();
      fetchNotes();
    } catch (error) {
      alert("❌ Ôi xóa thư mục thất bại rồi!");
    }
  }

  const handleToggleSelectFolder = (e, folderId) => {
    e.stopPropagation();
    if (selectedFolderIds.includes(folderId)) {
      setSelectedFolderIds(selectedFolderIds.filter(id => id !== folderId));
    } else {
      setSelectedFolderIds([...selectedFolderIds, folderId]);
    }
  }

  const handleBulkDeleteFolders = async () => {
    const count = selectedFolderIds.length;
    if (count === 0) return;

    const confirmDelete = window.confirm(`⚠️ CẢNH BÁO CỰC NGUY HIỂM ⚠️\n\nBạn có chắc chắn muốn xóa nhanh ${count} thư mục đang chọn không?`);
    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/folders`, { data: { ids: selectedFolderIds }, ...getAuthHeader() });
      alert(`🎉 Đã dọn dẹp sạch sẽ ${count} thư mục rực rỡ!`);
      if (selectedFolderIds.includes(selectedFolderId)) setSelectedFolderId(null);
      setSelectedFolderIds([]);
      setIsMultiSelectFoldersMode(false);
      fetchFolders();
      fetchNotes();
    } catch (error) {
      alert("❌ Xóa hàng loạt thư mục thất bại rồi!");
    }
  }

  const handleSaveNote = async () => {
    if (!selectedFolderId) {
      alert("🧸 Chọn thư mục bên trái trước nhé bạn ơi!")
      return
    }
    if (!title.trim()) {
      alert("🧸 Điền tiêu đề chất chơi phát nào!")
      return
    }

    const cleanFolderId = Number(selectedFolderId)
    if (!cleanFolderId || cleanFolderId <= 0) return

    try {
      if (editingNoteId) {
        await axios.put(`${API_URL}/notes/${editingNoteId}`, { title, content }, getAuthHeader());
        alert("🎉 Đã cập nhật ghi chú thành công rực rỡ!");
      } else {
        await axios.post(`${API_URL}/notes`, { title, content, folder_id: cleanFolderId }, getAuthHeader())
        alert("🎉 Đã lưu ghi chú mới thành công!");
      }
      setTitle('')
      setContent('')
      setEditingNoteId(null)
      fetchNotes() 
    } catch (error) {
      alert("❌ Thao tác thất bại rồi!");
    }
  }

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id); 
    setTitle(note.title);      
    setContent(note.content);  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setTitle('');
    setContent('');
  }

  const handleToggleSelectNote = (noteId) => {
    if (selectedNoteIds.includes(noteId)) {
      setSelectedNoteIds(selectedNoteIds.filter(id => id !== noteId));
    } else {
      setSelectedNoteIds([...selectedNoteIds, noteId]);
    }
  }

  const handleTogglePinNote = (noteId) => {
    if (pinnedNoteIds.includes(noteId)) {
      setPinnedNoteIds(pinnedNoteIds.filter(id => id !== noteId));
    } else {
      setPinnedNoteIds([...pinnedNoteIds, noteId]);
    }
  }

  const handleSelectAllVisibleNotes = (visibleNotes) => {
    if (selectedNoteIds.length === visibleNotes.length) {
      setSelectedNoteIds([]); 
    } else {
      setSelectedNoteIds(visibleNotes.map(n => n.id)); 
    }
  }

  const handleBulkDeleteNotes = async () => {
    const count = selectedNoteIds.length;
    if (count === 0) return;
    if (!window.confirm(`🗑️ Bạn có chắc chắn muốn xóa nhanh ${count} ghi chú không?`)) return;

    try {
      await axios.delete(`${API_URL}/notes`, { data: { ids: selectedNoteIds }, ...getAuthHeader() });
      alert(`🎉 Đã dọn dẹp gọn gàng ${count} ghi chú rồi nhé!`);
      setSelectedNoteIds([]); 
      if (selectedNoteIds.includes(editingNoteId)) handleCancelEdit(); 
      fetchNotes(); 
    } catch (error) {
      alert("❌ Xóa thất bại rồi!");
    }
  }

  const filteredNotes = notes
    .filter(note => {
      const isInsideFolder = Number(note.folder_id) === Number(selectedFolderId);
      const matchesSearch = 
        note.title.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        note.content.toLowerCase().includes(searchKeyword.toLowerCase());
      return isInsideFolder && matchesSearch;
    })
    .sort((a, b) => {
      const aPinned = pinnedNoteIds.includes(a.id);
      const bPinned = pinnedNoteIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    })

  const currentFolder = folders.find(f => Number(f.id) === Number(selectedFolderId))

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],        
      [{'list': 'ordered'}, {'list': 'bullet'}, {'list': 'check'}], 
      ['clean']                                         
    ],
  }

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Vừa xong';
    try {
      let date = new Date(isoString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
    } catch (e) { 
      return isoString; 
    }
  }

  // --- 🌟 CHIẾU MÀN HÌNH XÁC THỰC BỒNG BỀNH 🌟 ---
  if (!token) {
    return (
      <div style={{ display: 'flex', height: '100vh', width: '100vw', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #fef08a 0%, #fbcfe8 50%, #cffafe 100%)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', position: 'fixed', top: 0, left: 0, margin: 0, padding: 0, boxSizing: 'border-box' }}>
        
        {isResetMode ? (
          /* FORM ĐỔI MẬT KHẨU MỚI */
          <form onSubmit={handleUpdatePassword} style={{ background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(20px)', padding: isMobile ? '30px 20px' : '40px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', width: isMobile ? '90%' : '360px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'inherit' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '45px' }}>🔮</span>
              <h2 style={{ margin: '10px 0 5px 0', fontWeight: '900', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'inherit' }}>Susu Space</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontWeight: '700', fontFamily: 'inherit' }}>ĐẶT LẠI MẬT KHẨU MỚI TINH</p>
            </div>
            <input type="password" placeholder="🔑 Nhập mật khẩu mới của bạn..." value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ padding: '14px', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.2)', outline: 'none', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} required />
            <button type="submit" style={{ padding: '14px', background: 'linear-gradient(90deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(16,185,129,0.2)', fontFamily: 'inherit' }}>💾 Cập Nhật Mật Khẩu</button>
          </form>
        ) : (
          /* FORM ĐĂNG NHẬP / ĐĂNG KÝ / QUÊN MẬT KHẨU GỐC */
          <form onSubmit={isAuthMode === 'forgot' ? handleForgotPassword : handleAuth} style={{ background: 'rgba(255, 255, 255, 0.45)', backdropFilter: 'blur(20px)', padding: isMobile ? '30px 20px' : '40px', borderRadius: '30px', border: '1px solid rgba(255, 255, 255, 0.5)', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', width: isMobile ? '90%' : '360px', display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'inherit' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '45px' }}>🔮</span>
              <h2 style={{ margin: '10px 0 5px 0', fontWeight: '900', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'inherit' }}>Susu Space</h2>
              <p style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontWeight: '700', fontFamily: 'inherit' }}>
                {isAuthMode === 'login' && "ĐĂNG NHẬP TRẠM KHÔNG GIAN"}
                {isAuthMode === 'register' && "ĐĂNG KÝ TÀI KHOẢN MỚI"}
                {isAuthMode === 'forgot' && "KHÔI PHỤC MẬT KHẨU"}
              </p>
            </div>
            
            {/* Ô Email */}
            <input type="email" placeholder="✉️ Nhập Email của bạn..." value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} style={{ padding: '14px', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.2)', outline: 'none', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />

            {/* Ô nhập Mật khẩu (Chỉ hiện khi Đăng nhập/Đăng ký) */}
            {isAuthMode !== 'forgot' && (
              <input type="password" placeholder="🔑 Nhập Mật khẩu..." value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} style={{ padding: '14px', borderRadius: '14px', border: '1px solid rgba(139,92,246,0.2)', outline: 'none', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }} />
            )}
            
            <button type="submit" style={{ padding: '14px', background: 'linear-gradient(90deg, #ff007f, #7928ca)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 8px 20px rgba(244,63,94,0.2)', fontFamily: 'inherit' }}>
              {isAuthMode === 'login' && "🚀 Kích Hoạt Đăng Nhập"}
              {isAuthMode === 'register' && "✨ Tạo Tài Khoản"}
              {isAuthMode === 'forgot' && "📩 Gửi Link Khôi Phục"}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'center', fontSize: '12px', color: '#4b5563', fontWeight: '600', fontFamily: 'inherit' }}>
              {isAuthMode === 'login' && (
                <>
                  <p style={{ margin: 0 }}>Chưa có hành tinh riêng? <span onClick={() => setIsAuthMode('register')} style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '800', textDecoration: 'underline' }}>Đăng ký ngay</span></p>
                  <p style={{ margin: 0 }}><span onClick={() => setIsAuthMode('forgot')} style={{ color: '#6b7280', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}>Quên mật khẩu rồi 🥺</span></p>
                </>
              )}
              {isAuthMode === 'register' && (
                <p style={{ margin: 0 }}>Đã có tài khoản từ trước? <span onClick={() => setIsAuthMode('login')} style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '800', textDecoration: 'underline' }}>Đăng nhập</span></p>
              )}
              {isAuthMode === 'forgot' && (
                <p style={{ margin: 0 }}>Quay lại màn hình chính? <span onClick={() => setIsAuthMode('login')} style={{ color: '#8b5cf6', cursor: 'pointer', fontWeight: '800', textDecoration: 'underline' }}>Đăng nhập ngay</span></p>
              )}
            </div>
          </form>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', margin: 0, padding: 0, background: 'linear-gradient(135deg, #fef08a 0%, #fbcfe8 50%, #cffafe 100%)', position: 'fixed', top: 0, left: 0, overflow: 'hidden', flexDirection: isMobile ? 'column' : 'row' }}>
      
      {/* 📱 THANH TOPBAR ĐIỀU HƯỚNG MOBILE */}
      {isMobile && (
        <div style={{ width: '100%', height: '65px', background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box', zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <span style={{ fontSize: '22px' }}>{isMobileMenuOpen ? '✕' : '☰'}</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Susu Space</h3>
          </div>
          <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}>🚪 Rời trạm</button>
        </div>
      )}

      {/* 1. THANH SIDEBAR BÊN TRÁI */}
      <div style={{ 
        width: isMobile ? '280px' : '340px', 
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.65) 100%)', 
        backdropFilter: 'blur(20px)', 
        padding: '25px 20px', 
        borderRight: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.5)', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '15px', 
        height: '100%', 
        boxSizing: 'border-box', 
        boxShadow: '10px 0 30px rgba(0,0,0,0.03)',
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: isMobile ? (isMobileMenuOpen ? '0' : '-300px') : '0',
        zIndex: 99,
        transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🚀</span>
              <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900', background: 'linear-gradient(45deg, #ec4899, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Susu Space</h3>
            </div>
            <button onClick={handleLogout} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>🚪 Rời trạm</button>
          </div>
        )}

        <p style={{ margin: 0, fontSize: '11px', color: '#4b5563', fontWeight: '700', wordBreak: 'break-all', backgroundColor: 'rgba(255,255,255,0.4)', padding: '8px 12px', borderRadius: '10px', fontFamily: 'inherit' }}>👤 Phi hành gia: <span style={{color: '#7928ca'}}>{userEmail}</span></p>

        <div style={{ position: 'relative' }}>
          <input type="text" value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="🔍 Tìm nhanh ghi chú..." style={{ width: '100%', padding: '12px 15px', borderRadius: '14px', border: '1px solid rgba(139, 92, 246, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box', color: '#1e1b4b', fontFamily: 'inherit' }} />
          {searchKeyword && <button onClick={() => setSearchKeyword('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer' }}>❌</button>}
        </div>

        <button onClick={handleAddFolder} style={{ width: '100%', padding: '12px', background: 'linear-gradient(90deg, #ff007f, #7928ca)', color: '#ffffff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(244, 63, 94, 0.2)', fontFamily: 'inherit' }}>✨ Tạo Không Gian Mới</button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: '800', letterSpacing: '0.5px', fontFamily: 'inherit' }}>🔮 DANH SÁCH KHÔNG GIAN</p>
            <button onClick={() => { setIsMultiSelectFoldersMode(!isMultiSelectFoldersMode); setSelectedFolderIds([]); }} style={{ background: 'transparent', border: 'none', color: isMultiSelectFoldersMode ? '#ef4444' : '#3b82f6', fontSize: '11px', fontWeight: '800', cursor: 'pointer', fontFamily: 'inherit' }}>{isMultiSelectFoldersMode ? "Hủy" : "Chọn nhiều ⚡"}</button>
          </div>

          {isMultiSelectFoldersMode && selectedFolderIds.length > 0 && (
            <button onClick={handleBulkDeleteFolders} style={{ width: '100%', padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>🗑️ Xóa đã chọn ({selectedFolderIds.length})</button>
          )}

          {folders.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', fontStyle: 'italic', fontFamily: 'inherit' }}>Trống trơn luôn 🪐</p>
          ) : (
            folders.map(folder => {
              const isSelected = Number(folder.id) === Number(selectedFolderId)
              const isFolderHovered = folder.id === hoveredFolderId
              const isFolderChecked = selectedFolderIds.includes(folder.id)

              return (
                <div key={folder.id} onClick={() => !isMultiSelectFoldersMode && setSelectedFolderId(folder.id)} onMouseEnter={() => setHoveredFolderId(folder.id)} onMouseLeave={() => setHoveredFolderId(null)} style={{ padding: '12px 14px', borderRadius: '14px', background: isFolderChecked ? 'rgba(254, 226, 226, 0.9)' : (isSelected ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : 'rgba(255, 255, 255, 0.5)'), border: isFolderChecked ? '1px solid #fca5a5' : (isSelected ? 'none' : '1px solid rgba(255,255,255,0.6)'), cursor: 'pointer', fontWeight: '700', color: isSelected && !isFolderChecked ? '#ffffff' : '#1e1b4b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s', position: 'relative', fontFamily: 'inherit' }}>
                  {isMultiSelectFoldersMode ? (
                    <input type="checkbox" checked={isFolderChecked} onChange={(e) => handleToggleSelectFolder(e, folder.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }} />
                  ) : (
                    <span style={{ fontSize: '16px' }}>{isSelected ? '🔥' : '🪐'}</span>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>{folder.name}</div>
                  {!isMultiSelectFoldersMode && (isFolderHovered || isMobile) && (
                    <button onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '20px', padding: '12px', display: 'flex', gap: '5px', justifyContent: 'space-around', marginTop: 'auto' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '900', color: '#8b5cf6' }}>{folders.length}</div><div style={{ fontSize: '9px', fontWeight: '800', color: '#6b7280' }}>📁 KHÔNG GIAN</div></div>
          <div style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.05)' }}></div>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '18px', fontWeight: '900', color: '#10b981' }}>{notes.length}</div><div style={{ fontSize: '9px', fontWeight: '800', color: '#6b7280' }}>📝 GHI CHÉP</div></div>
        </div>
      </div>

      {/* LỚP PHỦ NỀN MOBILE */}
      {isMobile && isMobileMenuOpen && (
        <div onClick={() => setIsMobileMenuOpen(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)', zIndex: 98 }} />
      )}

      {/* 2. VÙNG NỘI DUNG BÊN PHẢI (STUDIO CHÍNH) */}
      <div style={{ flex: 1, padding: isMobile ? '20px' : '40px', overflowY: 'auto', height: isMobile ? 'calc(100vh - 65px)' : '100%', boxSizing: 'border-box' }}>
        {!selectedFolderId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#4c1d95', textAlign: 'center', padding: '20px' }}>
            <span style={{ fontSize: isMobile ? '50px' : '70px', marginBottom: '10px' }}>🛸</span>
            <h2 style={{ fontWeight: '900', fontSize: isMobile ? '22px' : '28px', margin: '0 0 10px 0' }}>Chào mừng tới Susu Space!</h2>
            <p style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', opacity: 0.8, maxWidth: '400px' }}>
              {isMobile ? "👉 Hãy bấm vào nút Menu ☰ ở góc trái để chọn Không gian ghi chép của riêng bạn nhé!" : "Hãy chọn một không gian riêng của bạn bên trái để kích hoạt trạm sáng tạo nhé!"}
            </p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ margin: '0 0 20px 0', background: 'rgba(255,255,255,0.4)', padding: isMobile ? '15px' : '20px', borderRadius: '24px', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.4)' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#1e1b4b', fontSize: isMobile ? '20px' : '28px', fontWeight: '900' }}>✨ Studio Sáng Tạo</h2>
                <p style={{ color: '#475569', margin: 0, fontSize: isMobile ? '12px' : '14px', fontWeight: '600' }}>Hành tinh: <span style={{ background: 'linear-gradient(45deg, #f43f5e, #ec4899)', padding: '4px 10px', borderRadius: '20px', color: '#ffffff', fontWeight: '800', fontSize: '12px' }}>{currentFolder?.name}</span></p>
              </div>
              <span style={{ fontSize: isMobile ? '30px' : '40px' }}>🎨</span>
            </div>
            
            <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.6)', padding: isMobile ? '20px 15px' : '35px', borderRadius: '32px', marginBottom: '30px', boxShadow: '0 20px 50px rgba(76, 29, 149, 0.08)' }}>
              <h3 style={{ margin: '0 0 15px 0', color: '#1e1b4b', fontWeight: '800', fontSize: isMobile ? '15px' : '18px' }}>{editingNoteId ? "✏️ Đang sửa ghi chú cũ..." : `✏️ Viết ghi chú mới vào [${currentFolder?.name}]`}</h3>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="🚀 Đặt tiêu đề cực cháy tại đây..." style={{ width: '100%', padding: '14px 18px', marginBottom: '15px', borderRadius: '18px', border: '2px solid rgba(139, 92, 246, 0.2)', backgroundColor: '#ffffff', fontSize: '15px', fontWeight: '700', outline: 'none', boxSizing: 'border-box', color: '#1e1b4b', fontFamily: 'inherit' }} />
              <div style={{ marginBottom: '15px', backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(139, 92, 246, 0.2)' }}>
                <ReactQuill theme="snow" value={content} onChange={setContent} modules={quillModules} placeholder="Ghi lại những ý tưởng đột phá của bạn tại đây..." style={{ height: isMobile ? '160px' : '220px', marginBottom: '42px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                {editingNoteId && <button onClick={handleCancelEdit} style={{ padding: '10px 20px', background: 'rgba(107, 114, 128, 0.1)', color: '#4b5563', border: 'none', borderRadius: '14px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}>Hủy sửa</button>}
                <button onClick={handleSaveNote} style={{ padding: isMobile ? '12px 20px' : '14px 35px', background: editingNoteId ? 'linear-gradient(90deg, #a855f7, #06b6d4)' : 'linear-gradient(90deg, #10b981, #059669)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: '800', fontSize: isMobile ? '14px' : '16px', cursor: 'pointer' }}>{editingNoteId ? "💾 Cập Nhật" : "🚀 Bắn Lên Mây"}</button>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '10px', marginBottom: '25px' }}>
                <h3 style={{ color: '#1e1b4b', fontSize: isMobile ? '17px' : '20px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📚</span> {searchKeyword ? `Kết quả cho "${searchKeyword}"` : 'Kho Ghi Chép Diệu Kỳ'} ({filteredNotes.length})
                </h3>
                {filteredNotes.length > 0 && (
                  <button onClick={() => handleSelectAllVisibleNotes(filteredNotes)} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,92,246,0.3)', padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', color: '#4c1d95', cursor: 'pointer', width: isMobile ? '100%' : 'auto' }}>{selectedNoteIds.length === filteredNotes.length ? "🚫 Bỏ chọn tất cả" : "✅ Chọn tất cả mục"}</button>
                )}
              </div>

              {selectedNoteIds.length > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #fef2f2, #fee2e2)', border: '1px solid #fca5a5', padding: '12px 15px', borderRadius: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#991b1b', fontWeight: '700', fontSize: '13px' }}>🔥 Chọn <span style={{fontSize: '15px', color: '#ef4444'}}>{selectedNoteIds.length}</span> mục...</span>
                  <button onClick={handleBulkDeleteNotes} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 14px', borderRadius: '12px', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}>🗑️ Xóa loạt</button>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {filteredNotes.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.3)', padding: '30px', borderRadius: '24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.6)' }}>
                    <p style={{ color: '#4c1d95', margin: 0, fontStyle: 'italic', fontWeight: '600', fontSize: '13px' }}>{searchKeyword ? '🔍 Không tìm thấy ghi chú nào khớp...' : 'Hành tinh này chưa có sự sống 🪐 Viết bài đầu tiên ngay nào!'}</p>
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const isChecked = selectedNoteIds.includes(note.id);
                    const isPinned = pinnedNoteIds.includes(note.id);

                    return (
                      <div key={note.id} style={{ background: isChecked ? 'rgba(254, 242, 242, 0.95)' : (isPinned ? 'linear-gradient(135deg, #fffbeb 0%, #fffdf5 100%)' : 'rgba(255, 255, 255, 0.9)'), border: isChecked ? '2px solid #fca5a5' : (isPinned ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.8)'), padding: isMobile ? '15px' : '25px', borderRadius: '24px', display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', flexDirection: 'column' }}>
                        
                        {/* PHẦN HEADER CỦA THẺ GHI CHÚ */}
                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between', gap: '15px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleSelectNote(note.id)} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#ef4444', flexShrink: 0 }} />
                            <h4 style={{ margin: 0, color: '#1e1b4b', fontSize: isMobile ? '16px' : '18px', fontWeight: '800', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{isPinned ? "🔥 " : "📌 "}{note.title}</h4>
                          </div>
                          
                          <div style={{ flexShrink: 0 }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '8px', fontWeight: '700', whiteSpace: 'nowrap' }}>🗓️ {formatDateTime(note.created_at)}</span>
                          </div>
                        </div>
                        
                        {/* NỘI DUNG GHI CHÚ */}
                        <div className="ql-editor" dangerouslySetInnerHTML={{ __html: note.content }} style={{ color: '#334155', fontSize: isMobile ? '14px' : '15px', lineHeight: '1.6', padding: 0, width: '100%', wordBreak: 'break-word', marginTop: '5px', marginBottom: '35px' }} />
                        
                        {/* HÀNH ĐỘNG NÚT BẤM */}
                        <div style={{ position: 'absolute', bottom: '12px', right: '15px', display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleTogglePinNote(note.id)} style={{ background: isPinned ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)', color: isPinned ? '#ffffff' : '#d97706', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>{isPinned ? "Đã ghim" : "📌 Ghim"}</button>
                          <button onClick={() => handleStartEditNote(note)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>✏️ Sửa</button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

export default App;