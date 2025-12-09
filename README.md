
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

---

## 🛠 QUAN TRỌNG: Cấu hình Bảo mật Firebase (Security Rules)

Để các tính năng **Trả lời**, **Thông báo**, **Tin nhắn**, **Đăng ảnh** và **Admin** hoạt động, bạn **BẮT BUỘC** phải cập nhật Firestore Rules và Storage Rules trên Firebase Console.

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
    
    function isOwner(userId) { 
      return isSignedIn() && request.auth.uid == userId; 
    }
    
    // Kiểm tra quyền Admin bằng cách đọc document user hiện tại
    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }

    // --- Users Collection ---
    match /users/{userId} {
      allow read: if true;
      allow create: if isOwner(userId); 
      // Admin được phép sửa (Ban user, cấp quyền), Chủ sở hữu được sửa profile
      allow update: if isOwner(userId) || isAdmin(); 
    }

    // --- Questions Collection ---
    match /questions/{questionId} {
      allow read: if true;
      allow create: if isSignedIn();
      // Admin được phép ẩn/xóa bài vi phạm, Chủ sở hữu được sửa bài
      allow update: if isSignedIn() || isAdmin(); 
      allow delete: if isOwner(resource.data.author.id) || isAdmin();
    }

    // --- Notifications Collection ---
    match /notifications/{notificationId} {
      allow read, update: if isOwner(resource.data.userId);
      allow create: if isSignedIn();
    }

    // --- Chats Collection ---
    match /chats/{chatId} {
      allow read: if isSignedIn() && (request.auth.uid in resource.data.participants);
      allow create: if isSignedIn();
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
      allow write: if request.auth != null 
                   && request.resource.contentType.matches('image/.*')
                   && request.resource.size < 5 * 1024 * 1024; // Max 5MB
    }
  }
}
```

---

## 🚀 Cài đặt & Chạy (Local)

1.  **Cài đặt**:
    ```bash
    npm install
    ```

2.  **Cấu hình `.env`**:
    Tạo file `.env` ở thư mục gốc và điền thông tin:
    ```env
    VITE_API_KEY=AIzaSy... (Gemini API Key)
    VITE_FIREBASE_API_KEY=AIzaSy... (Firebase API Key)
    VITE_FIREBASE_AUTH_DOMAIN=...
    VITE_FIREBASE_PROJECT_ID=...
    VITE_FIREBASE_STORAGE_BUCKET=...
    VITE_FIREBASE_MESSAGING_SENDER_ID=...
    VITE_FIREBASE_APP_ID=...
    ```

3.  **Chạy dự án**:
    ```bash
    npm run dev
    ```
