
# Asking.vn - Nền tảng Hỏi đáp Mẹ & Bé và Giáo dục sớm

**Asking.vn** là một ứng dụng web cao cấp (Premium Web App) dành cho cộng đồng Mẹ & Bé tại Việt Nam.

---

## 🛠 QUAN TRỌNG: Sửa lỗi "Missing permissions" (Permission denied)

Để các tính năng **Thông báo**, **Tin nhắn**, **Đăng ảnh** hoạt động cho cả Khách và Thành viên, bạn **BẮT BUỘC** phải cập nhật Firestore Rules trên Firebase Console.

### 1. Cập nhật Firestore Rules (Quan trọng nhất)
Truy cập [Firebase Console](https://console.firebase.google.com/) -> **Firestore Database** -> **Rules**.
Copy và thay thế toàn bộ bằng đoạn mã sau:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 1. Hàm kiểm tra đăng nhập (Bao gồm cả Khách ẩn danh)
    function isSignedIn() { return request.auth != null; }
    
    // 2. Hàm kiểm tra chính chủ
    function isOwner(userId) { return isSignedIn() && request.auth.uid == userId; }

    // --- Users Collection ---
    match /users/{userId} {
      allow read: if true;
      allow create: if isOwner(userId); // Cho phép Khách tạo user ẩn danh
      allow update: if isSignedIn(); // Cho phép update thông tin (follow,...)
    }

    // --- Questions Collection ---
    match /questions/{questionId} {
      allow read: if true;
      allow create: if isSignedIn();
      // Cho phép update (like, comment) cho tất cả user đã đăng nhập
      allow update: if isSignedIn();
      allow delete: if isOwner(resource.data.author.id);
    }

    // --- Notifications Collection (Mới) ---
    match /notifications/{notificationId} {
      // Chỉ chủ sở hữu mới đọc được thông báo của mình
      allow read: if isOwner(resource.data.userId);
      // Cho phép bất kỳ ai đã đăng nhập gửi thông báo (khi like/comment)
      allow create: if isSignedIn();
      // Cho phép đánh dấu đã đọc
      allow update: if isOwner(resource.data.userId);
    }

    // --- Chats Collection (Mới) ---
    match /chats/{chatId} {
      // Cho phép đọc/ghi nếu user là người tham gia (participants array)
      allow read: if isSignedIn() && request.auth.uid in resource.data.participants;
      allow create: if isSignedIn();
      allow update: if isSignedIn() && request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read: if isSignedIn();
        allow create: if isSignedIn();
      }
    }
  }
}
```

### 2. Cập nhật Storage Rules (Upload Ảnh)
Truy cập [Firebase Console](https://console.firebase.google.com/) -> **Storage** -> **Rules**.
Copy và thay thế toàn bộ bằng đoạn mã sau:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Cho phép upload ảnh câu hỏi vào thư mục question_images
    match /question_images/{allPaths=**} {
      allow read: if true;
      // Cho phép ghi nếu đã đăng nhập và là file ảnh < 5MB
      allow write: if request.auth != null 
                   && request.resource.contentType.matches('image/.*')
                   && request.resource.size < 5 * 1024 * 1024;
    }
    
    // Hồ sơ chuyên gia
    match /expert_docs/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
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
    ```env
    VITE_API_KEY=AIzaSy... (Gemini API Key)
    VITE_FIREBASE_API_KEY=AIzaSy... (Firebase API Key)
    # ... các biến Firebase khác
    ```

3.  **Chạy dự án**:
    ```bash
    npm run dev
    ```
