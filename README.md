
# Asking.vn - Nền tảng Hỏi đáp Mẹ & Bé và Giáo dục sớm

**Asking.vn** là một ứng dụng web cao cấp (Premium Web App) dành cho cộng đồng Mẹ & Bé tại Việt Nam.

---

## 👑 Hướng dẫn Quản trị (Admin)

Mặc định, tất cả tài khoản đăng ký mới đều là **Thành viên (User)**. Để truy cập trang Admin (`/admin`), bạn cần cấp quyền thủ công trong Firebase Console.

### Cách cấp quyền Admin:
1. Truy cập [Firebase Console](https://console.firebase.google.com/) -> **Firestore Database**.
2. Chọn collection `users`.
3. Tìm document của user bạn muốn cấp quyền (dựa theo ID hoặc Email).
4. Thêm một field mới:
   - Field: `isAdmin`
   - Type: `boolean`
   - Value: `true`
5. Quay lại ứng dụng và truy cập đường dẫn `/admin`.
   *(Hoặc sử dụng nút "Kích hoạt Admin" ở chế độ Dev trong trang Cá nhân)*

---

## 🛠 QUAN TRỌNG: Cấu hình Bảo mật Firebase (Security Rules)

Để các tính năng **Trả lời**, **Thông báo**, **Tin nhắn**, **Đăng ảnh**, **Admin**, **Sinh dữ liệu giả (Seed)**, **Game Data**, **Quảng cáo** và **Blog** hoạt động, bạn **BẮT BUỘC** phải cập nhật Firestore Rules và Storage Rules trên Firebase Console.

### 1. Cập nhật Firestore Rules (Database)
Truy cập [Firebase Console](https://console.firebase.google.com/) -> **Firestore Database** -> **Rules**.
Copy và thay thế toàn bộ bằng đoạn mã sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // --- Helper Functions ---
    function isSignedIn() { 
      return request.auth != null; 
    }
    
    // Kiểm tra chính chủ
    function isOwner(userId) { 
      return isSignedIn() && request.auth.uid == userId; 
    }
    
    // Kiểm tra quyền Admin (đọc từ doc user hiện tại)
    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // Kiểm tra quyền Chuyên gia
    function isExpert() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isExpert == true;
    }

    // --- Users Collection ---
    match /users/{userId} {
      allow read: if true;
      // QUAN TRỌNG: Cho phép Admin tạo/update user khác để chạy Seed Data & Ban user
      allow create, update, delete: if isOwner(userId) || isAdmin(); 
    }

    // --- Questions Collection ---
    match /questions/{questionId} {
      allow read: if true;
      // Admin được phép tạo câu hỏi hộ người khác (Seed Data)
      allow create: if isSignedIn();
      // Admin được phép ẩn/xóa bài vi phạm hoặc cập nhật câu trả lời hay nhất
      allow update: if isSignedIn() || isAdmin(); 
      allow delete: if isOwner(resource.data.author.id) || isAdmin();
    }

    // --- Notifications Collection ---
    match /notifications/{notificationId} {
      // Người nhận xem, người gửi tạo
      allow read, update: if isOwner(resource.data.userId);
      allow create: if isSignedIn();
    }

    // --- Chats Collection ---
    match /chats/{chatId} {
      // Cho phép tạo chat mới
      allow create: if isSignedIn();
      
      // Chỉ người trong cuộc mới được xem/sửa
      allow read: if isSignedIn() && (request.auth.uid in resource.data.participants);
      
      // Update (gửi tin nhắn mới làm thay đổi lastMessage)
      allow update: if isSignedIn() && (request.auth.uid in resource.data.participants);
      
      match /messages/{messageId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn();
      }
    }
    
    // --- Expert Applications (Dành cho Admin duyệt) ---
    match /expert_applications/{appId} {
      allow create: if isSignedIn();
      // Chỉ user tạo đơn mới xem được đơn của mình, hoặc Admin xem tất cả
      allow read: if isOwner(resource.data.userId) || isAdmin();
      // Chỉ Admin mới được update trạng thái (Duyệt/Từ chối)
      allow update: if isAdmin();
    }

    // --- Reports ---
    match /reports/{reportId} {
      allow create: if isSignedIn();
      allow read, update: if isAdmin();
    }

    // --- Games Collection (Data Driven) ---
    match /games/{gameId} {
      allow read: if true; // Ai cũng xem được game
      allow write: if isAdmin(); // Chỉ Admin sửa game
      
      match /questions/{questionId} {
        allow read: if true;
        allow write: if isAdmin();
      }
    }

    // --- Game Categories ---
    match /game_categories/{categoryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // --- AD CONFIGURATION ---
    match /ad_config/{docId} {
      allow read: if true; // Mọi người dùng xem được quảng cáo
      allow write: if isAdmin(); // Chỉ Admin cấu hình
    }

    // --- BLOG MODULE ---
    match /blogCategories/{docId} {
        allow read: if true;
        allow write: if isAdmin();
    }

    match /blogPosts/{docId} {
        allow read: if true;
        allow create: if isAdmin() || (isExpert() && request.resource.data.authorId == request.auth.uid);
        allow update, delete: if isAdmin() || (isExpert() && resource.data.authorId == request.auth.uid);
    }

    match /blogComments/{docId} {
        allow read: if true;
        allow create: if isSignedIn();
        allow update, delete: if isAdmin() || (isSignedIn() && resource.data.authorId == request.auth.uid);
    }
  }
}
```

### 2. Cập nhật Storage Rules (Upload Ảnh)
Truy cập [Firebase Console](https://console.firebase.google.com/) -> **Storage** -> **Rules**.

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      // Cho phép ghi nếu đã đăng nhập
      // Chấp nhận ảnh và PDF (cho hồ sơ chuyên gia)
      // Giới hạn kích thước < 10MB
      allow write: if request.auth != null 
                   && (request.resource.contentType.matches('image/.*') || request.resource.contentType == 'application/pdf')
                   && request.resource.size < 10 * 1024 * 1024;
    }
    
    // Thêm cụ thể cho answer_images nếu cần (phòng trường hợp match allPaths không bắt được sub-folder trong một số cấu hình cũ)
    match /answer_images/{fileName} {
       allow read: if true;
       allow write: if request.auth != null;
    }
  }
}
```

---

## 🧪 Hướng dẫn Sinh Dữ liệu Giả (Seed Data)

Tính năng này giúp tạo nhanh dữ liệu mẫu để kiểm thử giao diện.

1. Đăng nhập bằng tài khoản có quyền **Admin**.
2. Truy cập menu **Admin** -> chọn **Sinh dữ liệu (Demo)** hoặc vào đường dẫn `/admin/seed`.
3. Nhấn **"Bắt đầu sinh Data"**. Hệ thống sẽ tự động:
   - Tạo 50 người dùng giả (Avatar, Tên tiếng Việt ngẫu nhiên).
   - Tạo các câu hỏi mẫu theo chủ đề (Mang thai, Dinh dưỡng...).
   - Tự động tạo câu trả lời qua lại giữa các user giả.
4. Để xóa dữ liệu: Nhấn **"Xóa toàn bộ Data giả"** (Chỉ xóa các dữ liệu có cờ `isFake=true`, không ảnh hưởng dữ liệu thật).

---

## 🚀 Cài đặt & Chạy (Local)

1.  **Cài đặt**:
    ```bash
    npm install
    ```

2.  **Cấu hình `.env`**:
    Tạo file `.env` ở thư mục gốc và điền thông tin Firebase của bạn.

3.  **Chạy dự án**:
    ```bash
    npm run dev
    ```
