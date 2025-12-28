package com.hostel.app.controller;

import com.hostel.app.entity.Notice;
import com.hostel.app.repository.NoticeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notices")
@CrossOrigin(origins = "*")
public class NoticeController {

    @Autowired
    private NoticeRepository noticeRepository;

    @GetMapping
    public List<Notice> getAllNotices() {
        return noticeRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<Notice> createNotice(@RequestBody Notice notice) {
        notice.setCreatedDate(java.time.LocalDateTime.now());
        Notice savedNotice = noticeRepository.save(notice);
        return ResponseEntity.ok(savedNotice);
    }
}
