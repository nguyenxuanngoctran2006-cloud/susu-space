import { useState, useEffect } from 'react'
import axios from 'axios'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'

function App() {
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

  // 🌟 MỚI: Mảng lưu danh sách các ID ghi chú được ghim (Lưu tạm ở Frontend rất mượt)
  const [pinnedNoteIds, setPinnedNoteIds] = useState([])

  useEffect(() => {
    fetchFolders()
    fetchNotes() 
  }, [])

  useEffect(() => {
    setSelectedNoteIds([]);
    handleCancelEdit(); 
  }, [selectedFolderId])

  const fetchFolders = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/folders')
      setFolders(response.data)
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách thư mục:", error)
    }
  }

  const fetchNotes = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/notes')
      setNotes(response.data) 
    } catch (error) {
      console.error("❌ Lỗi lấy danh sách ghi chú:", error)
    }
  }

  const handleAddFolder = async () => {
    const folderName = prompt("🎨 Đặt tên cho thư mục rực rỡ mới nào:")
    if (!folderName || !folderName.trim()) return

    try {
      await axios.post('http://localhost:3000/api/folders', { name: folderName })
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
      await axios.delete(`http://localhost:3000/api/folders/${folderId}`);
      alert(`🎉 Đã dọn dẹp sạch sẽ không gian [${folderName}] rồi nhé!`);
      if (Number(selectedFolderId) === Number(folderId)) {
        setSelectedFolderId(null);
      }
      fetchFolders();
      fetchNotes();
    } catch (error) {
      console.error("Lỗi xóa thư mục:", error);
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

    const confirmDelete = window.confirm(`⚠️ CẢNH BÁO CỰC NGUY HIỂM ⚠️\n\nBạn có chắc chắn muốn xóa nhanh ${count} thư mục đang chọn không?\n🔥 TOÀN BỘ ghi chú nằm bên trong các thư mục này cũng sẽ bị XÓA SẠCH VĨNH VIỄN!`);
    if (!confirmDelete) return;

    try {
      await axios.delete('http://localhost:3000/api/folders', { data: { ids: selectedFolderIds } });
      alert(`🎉 Đã dọn dẹp sạch sẽ ${count} thư mục rực rỡ!`);
      if (selectedFolderIds.includes(selectedFolderId)) {
        setSelectedFolderId(null);
      }
      setSelectedFolderIds([]);
      setIsMultiSelectFoldersMode(false);
      fetchFolders();
      fetchNotes();
    } catch (error) {
      console.error(error);
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
        await axios.put(`http://localhost:3000/api/notes/${editingNoteId}`, {
          title: title,
          content: content
        });
        alert("🎉 Đã cập nhật ghi chú thành công rực rỡ!");
      } else {
        await axios.post('http://localhost:3000/api/notes', {
          title: title,
          content: content,
          folder_id: cleanFolderId 
        })
        alert("🎉 Đã lưu ghi chú mới thành công!");
      }
      
      setTitle('')
      setContent('')
      setEditingNoteId(null)
      fetchNotes() 
    } catch (error) {
      console.error(error)
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

  // 🌟 MỚI: Logic Ghim / Bỏ ghim ghi chú
  const handleTogglePinNote = (noteId) => {
    if (pinnedNoteIds.includes(noteId)) {
      setPinnedNoteIds(pinnedNoteIds.filter(id => id !== noteId)); // Bỏ ghim
    } else {
      setPinnedNoteIds([...pinnedNoteIds, noteId]); // Thêm vào danh sách ghim
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

    const confirmDelete = window.confirm(`🗑️ Bạn có chắc chắn muốn xóa nhanh ${count} ghi chú đang chọn không? Thao tác này không thể hoàn tác nha!`);
    if (!confirmDelete) return;

    try {
      await axios.delete('http://localhost:3000/api/notes', { data: { ids: selectedNoteIds } });
      alert(`🎉 Đã dọn dẹp gọn gàng ${count} ghi chú rồi nhé!`);
      setSelectedNoteIds([]); 
      if (selectedNoteIds.includes(editingNoteId)) handleCancelEdit(); 
      fetchNotes(); 
    } catch (error) {
      console.error(error);
      alert("❌ Xóa thất bại rồi!");
    }
  }

  // Logic lọc ghi chú cũ + 🌟 MỚI: Tự động đưa các bài được ghim lên hàng đầu danh sách (Sort)
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
      if (aPinned && !bPinned) return -1; // a lên trước
      if (!aPinned && bPinned) return 1;  // b lên trước
      return 0; // Giữ nguyên thứ tự ID giảm dần
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
      date.setHours(date.getHours() + 7);
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

  return (
    <div style={{ 
      display: 'flex', height: '100vh', width: '100vw',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      margin: 0, padding: 0, boxSizing: 'border-box',
      background: 'linear-gradient(135deg, #fef08a 0%, #fbcfe8 50%, #cffafe 100%)', 
      position: 'fixed', top: 0, left: 0, overflow: 'hidden'
    }}>
      
      {/* 1. THANH SIDEBAR BÊN TRÁI */}
      <div style={{ 
        width: '340px', 
        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)',
        backdropFilter: 'blur(16px)', 
        padding: '25px 24px', 
        borderRight: '1px solid rgba(255, 255, 255, 0.5)', 
        display: 'flex', flexDirection: 'column', gap: '15px', height: '100%', boxSizing: 'border-box',
        boxShadow: '10px 0 30px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '32px', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>🚀</span>
          <h3 style={{ 
            margin: 0, fontSize: '24px', fontWeight: '900',
            background: 'linear-gradient(45deg, #ec4899, #8b5cf6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Susu Space
          </h3>
        </div>

        <div style={{ position: 'relative' }}>
          <input 
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="🔍 Tìm nhanh ghi chú..."
            style={{
              width: '100%', padding: '12px 15px', borderRadius: '14px',
              border: '1px solid rgba(139, 92, 246, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px', fontWeight: '600', outline: 'none', boxSizing: 'border-box',
              color: '#1e1b4b', transition: 'all 0.3s', fontFamily: 'inherit'
            }}
          />
          {searchKeyword && (
            <button onClick={() => setSearchKeyword('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '12px' }}>❌</button>
          )}
        </div>

        <button onClick={handleAddFolder} style={{ 
          width: '100%', padding: '12px', 
          background: 'linear-gradient(90deg, #ff007f, #7928ca)', color: '#ffffff',
          border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '14px',
          cursor: 'pointer', boxShadow: '0 8px 20px rgba(244, 63, 94, 0.2)', fontFamily: 'inherit'
        }}>
          ✨ Tạo Không Gian Mới
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '5px 0' }}>
            <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontWeight: '800', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              🔮 DANH SÁCH KHÔNG GIAN
            </p>
            
            <button 
              onClick={() => {
                setIsMultiSelectFoldersMode(!isMultiSelectFoldersMode);
                setSelectedFolderIds([]);
              }}
              style={{
                background: 'transparent', border: 'none', color: isMultiSelectFoldersMode ? '#ef4444' : '#3b82f6',
                fontSize: '11px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', padding: 0, fontFamily: 'inherit'
              }}
            >
              {isMultiSelectFoldersMode ? "Hủy chọn" : "Chọn nhiều ⚡"}
            </button>
          </div>

          {isMultiSelectFoldersMode && selectedFolderIds.length > 0 && (
            <button
              onClick={handleBulkDeleteFolders}
              style={{
                width: '100%', padding: '10px', background: '#ef4444', color: 'white',
                border: 'none', borderRadius: '12px', fontWeight: '800', fontSize: '13px',
                cursor: 'pointer', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)', marginBottom: '5px', fontFamily: 'inherit'
              }}
            >
              🗑️ Xóa mục đã chọn ({selectedFolderIds.length})
            </button>
          )}

          {folders.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', fontStyle: 'italic' }}>Trống trơn luôn 🪐</p>
          ) : (
            folders.map(folder => {
              const isSelected = Number(folder.id) === Number(selectedFolderId)
              const isFolderHovered = folder.id === hoveredFolderId
              const isFolderChecked = selectedFolderIds.includes(folder.id)

              return (
                <div 
                  key={folder.id} 
                  onClick={() => !isMultiSelectFoldersMode && setSelectedFolderId(folder.id)} 
                  onMouseEnter={() => setHoveredFolderId(folder.id)}
                  onMouseLeave={() => setHoveredFolderId(null)}
                  style={{ 
                    padding: '14px 16px', borderRadius: '16px', 
                    background: isFolderChecked ? 'rgba(254, 226, 226, 0.9)' : (isSelected ? 'linear-gradient(90deg, #3b82f6, #06b6d4)' : 'rgba(255, 255, 255, 0.5)'), 
                    border: isFolderChecked ? '1px solid #fca5a5' : (isSelected ? 'none' : '1px solid rgba(255,255,255,0.6)'),
                    cursor: 'pointer', fontWeight: '700',
                    color: isSelected && !isFolderChecked ? '#ffffff' : '#1e1b4b', 
                    boxShadow: isSelected ? '0 8px 20px rgba(6, 182, 212, 0.3)' : '0 4px 6px rgba(0,0,0,0.01)',
                    fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s ease-in-out', position: 'relative'
                  }}
                >
                  {isMultiSelectFoldersMode ? (
                    <input type="checkbox" checked={isFolderChecked} onChange={(e) => handleToggleSelectFolder(e, folder.id)} style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#ef4444' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{isSelected ? '🔥' : '🪐'}</span>
                  )}
                  
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                    {folder.name}
                  </div>

                  {!isMultiSelectFoldersMode && isFolderHovered && (
                    <button onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* 🌟 MỚI: TRẠM THỐNG KÊ SÁNG TẠO BỒNG BỀNH GÓC DƯỚI SIDEBAR */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.6) 100%)',
          border: '1px solid rgba(139,92,246,0.15)', borderRadius: '20px', padding: '15px',
          boxShadow: '0 10px 20px rgba(0,0,0,0.02)', display: 'flex', gap: '10px', justifyContent: 'space-around',
          marginTop: 'auto'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#8b5cf6' }}>{folders.length}</div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280' }}>📁 KHÔNG GIAN</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'rgba(0,0,0,0.05)' }}></div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#10b981' }}>{notes.length}</div>
            <div style={{ fontSize: '10px', fontWeight: '800', color: '#6b7280' }}>📝 GHI CHÉP</div>
          </div>
        </div>

      </div>

      {/* 2. VÙNG NỘI DUNG BÊN PHẢI */}
      <div style={{ flex: 1, padding: '40px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
        
        {!selectedFolderId ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80%', color: '#4c1d95', textAlign: 'center' }}>
            <span style={{ fontSize: '70px', marginBottom: '10px' }}>🛸</span>
            <h2 style={{ fontWeight: '900', fontSize: '28px', margin: '0 0 10px 0' }}>Chào mừng tới Susu Space!</h2>
            <p style={{ fontSize: '16px', fontWeight: '600', opacity: 0.8, maxWidth: '400px' }}>Hãy click chọn một không gian rực rỡ bên trái để kích hoạt trạm sáng tạo của bạn nhé!</p>
          </div>
        ) : (
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            <div style={{ margin: '0 0 30px 0', background: 'rgba(255,255,255,0.4)', padding: '20px', borderRadius: '24px', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(255,255,255,0.4)' }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', color: '#1e1b4b', fontSize: '28px', fontWeight: '900' }}>✨ Studio Sáng Tạo</h2>
                <p style={{ color: '#475569', margin: 0, fontSize: '14px', fontWeight: '600' }}>
                  Đang thuộc hành tinh: <span style={{ background: 'linear-gradient(45deg, #f43f5e, #ec4899)', padding: '4px 12px', borderRadius: '20px', color: '#ffffff', fontWeight: '800', fontSize: '13px', boxShadow: '0 4px 10px rgba(244,63,94,0.2)' }}>{currentFolder?.name}</span>
                </p>
              </div>
              <span style={{ fontSize: '40px' }}>🎨</span>
            </div>
            
            <div style={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.75)', backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.6)', padding: '35px', borderRadius: '32px', marginBottom: '40px', 
              boxShadow: '0 20px 50px rgba(76, 29, 149, 0.08)' 
            }}>
              
              <h3 style={{ margin: '0 0 20px 0', color: '#1e1b4b', fontWeight: '800', fontSize: '18px' }}>
                {editingNoteId ? "✏️ Đang chỉnh sửa ghi chú cũ..." : `✏️ Viết ghi chú mới vào [${currentFolder?.name}]`}
              </h3>

              <input 
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="🚀 Đặt tiêu đề cực cháy tại đây..." 
                style={{ 
                  width: '100%', padding: '16px 20px', marginBottom: '20px', borderRadius: '18px', 
                  border: '2px solid rgba(139, 92, 246, 0.2)', backgroundColor: '#ffffff', 
                  fontSize: '16px', fontWeight: '700', outline: 'none', boxSizing: 'border-box',
                  color: '#1e1b4b', fontFamily: 'inherit'
                }} 
              />
              
              <div style={{ marginBottom: '20px', backgroundColor: '#ffffff', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(139, 92, 246, 0.2)' }}>
                <ReactQuill 
                  theme="snow" value={content} onChange={setContent} modules={quillModules}
                  placeholder="Ghi lại những ý tưởng đột phá của bạn tại đây..."
                  style={{ height: '220px', marginBottom: '42px', fontFamily: 'system-ui, sans-serif' }} 
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                {editingNoteId && (
                  <button onClick={handleCancelEdit} style={{ padding: '14px 25px', background: 'rgba(107, 114, 128, 0.1)', color: '#4b5563', border: 'none', borderRadius: '18px', fontWeight: '800', fontSize: '15px', cursor: 'pointer', fontFamily: 'inherit' }}>Hủy sửa</button>
                )}
                <button 
                  onClick={handleSaveNote}
                  style={{ 
                    padding: '14px 35px', 
                    background: editingNoteId ? 'linear-gradient(90deg, #a855f7, #06b6d4)' : 'linear-gradient(90deg, #10b981, #059669)', 
                    color: 'white', border: 'none', borderRadius: '18px', fontWeight: '800', fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit'
                  }}
                >
                  {editingNoteId ? "💾 Cập Nhật Ghi Chú" : "🚀 Bắn Lên Đám Mây"}
                </button>
              </div>
            </div>

            {/* DANH SÁCH GHI CHÚ */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: '#1e1b4b', fontSize: '20px', fontWeight: '900', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>📚</span> 
                  {searchKeyword ? `Kết quả tìm kiếm từ "${searchKeyword}"` : 'Kho Ghi Chép Diệu Kỳ'} ({filteredNotes.length})
                </h3>
                
                {filteredNotes.length > 0 && (
                  <button onClick={() => handleSelectAllVisibleNotes(filteredNotes)} style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(139,92,246,0.3)', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', color: '#4c1d95', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                    {selectedNoteIds.length === filteredNotes.length ? "🚫 Bỏ chọn tất cả" : "✅ Chọn tất cả mục"}
                  </button>
                )}
              </div>

              {selectedNoteIds.length > 0 && (
                <div style={{ background: 'linear-gradient(90deg, #fef2f2, #fee2e2)', border: '1px solid #fca5a5', padding: '15px 20px', borderRadius: '18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)' }}>
                  <span style={{ color: '#991b1b', fontWeight: '700', fontSize: '14px' }}>🔥 Đang chọn <span style={{fontSize: '16px', color: '#ef4444'}}>{selectedNoteIds.length}</span> ghi chú để dọn dẹp...</span>
                  <button onClick={handleBulkDeleteNotes} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 18px', borderRadius: '12px', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(239,68,68,0.2)', fontFamily: 'inherit' }}>🗑️ Xóa các mục đã chọn ({selectedNoteIds.length})</button>
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {filteredNotes.length === 0 ? (
                  <div style={{ background: 'rgba(255,255,255,0.3)', padding: '40px', borderRadius: '24px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.6)' }}>
                    <p style={{ color: '#4c1d95', margin: 0, fontStyle: 'italic', fontWeight: '600' }}>{searchKeyword ? '🔍 Không tìm thấy ghi chú nào khớp từ khóa này...' : 'Hành tinh này chưa có sự sống 🪐 Viết bài đầu tiên ngay nào!'}</p>
                  </div>
                ) : (
                  filteredNotes.map(note => {
                    const isChecked = selectedNoteIds.includes(note.id);
                    // 🌟 MỚI: Kiểm tra bài viết này có được ghim hay không
                    const isPinned = pinnedNoteIds.includes(note.id);

                    return (
                      <div key={note.id} style={{ 
                        // 🌟 MỚI: Nếu bài viết được ghim, đổi sang viền vàng Neon và nền phớt vàng hoàng kim siêu đẹp
                        background: isChecked ? 'rgba(254, 242, 242, 0.95)' : (isPinned ? 'linear-gradient(135deg, #fffbeb 0%, #fffdf5 100%)' : 'rgba(255, 255, 255, 0.9)'), 
                        border: isChecked ? '2px solid #fca5a5' : (isPinned ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.8)'),
                        padding: '25px', borderRadius: '24px', boxShadow: isPinned ? '0 10px 25px rgba(251,191,36,0.08)' : '0 10px 30px rgba(0, 0, 0, 0.02)',
                        display: 'flex', gap: '15px', alignItems: 'flex-start', transition: 'all 0.2s', position: 'relative'
                      }}>
                        
                        <input type="checkbox" checked={isChecked} onChange={() => handleToggleSelectNote(note.id)} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#ef4444', marginTop: '3px' }} />

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px', paddingRight: '120px' }}>
                            <h4 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px', fontWeight: '800' }}>
                              {/* 🌟 MỚI: Nếu ghim thì hiện icon ghim đỏ rực lửa */}
                              {isPinned ? "🔥 " : "📌 "}{note.title}
                            </h4>
                            <span style={{ fontSize: '12px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '10px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                              🗓️ {formatDateTime(note.created_at)}
                            </span>
                          </div>
                          
                          <div className="ql-editor" dangerouslySetInnerHTML={{ __html: note.content }} style={{ color: '#334155', fontSize: '15px', lineHeight: '1.7', padding: 0, fontFamily: 'system-ui, sans-serif' }} />
                        </div>

                        {/* THANH TÁC VỤ TIỆN ÍCH CHO TỪNG THẺ GHI CHÚ */}
                        <div style={{ position: 'absolute', bottom: '20px', right: '25px', display: 'flex', gap: '8px' }}>
                          
                          {/* 🌟 MỚI: NÚT GHIM / BỎ GHIM THÔNG MINH */}
                          <button
                            onClick={() => handleTogglePinNote(note.id)}
                            style={{
                              background: isPinned ? '#fbbf24' : 'rgba(251, 191, 36, 0.1)', 
                              color: isPinned ? '#ffffff' : '#d97706',
                              border: 'none', borderRadius: '8px', padding: '5px 12px',
                              fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            title={isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú lên đầu"}
                          >
                            {isPinned ? "❤️ Đã ghim" : "📌 Ghim"}
                          </button>

                          <button onClick={() => handleStartEditNote(note)} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(btn) => { btn.target.style.background = '#3b82f6'; btn.target.style.color = '#fff'; }} onMouseLeave={(btn) => { btn.target.style.background = 'rgba(59, 130, 246, 0.1)'; btn.target.style.color = '#3b82f6'; }}>✏️ Sửa</button>
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

export default App