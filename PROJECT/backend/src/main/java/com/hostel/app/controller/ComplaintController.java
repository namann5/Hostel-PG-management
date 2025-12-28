package com.hostel.app.controller;

import com.hostel.app.dto.ComplaintRequest;
import com.hostel.app.entity.Complaint;
import com.hostel.app.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/complaints")
@CrossOrigin(origins = "*")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @PostMapping
    public ResponseEntity<?> fileComplaint(@RequestBody ComplaintRequest request) {
        try {
            Complaint complaint = complaintService.fileComplaint(request.getStudentId(), request.getCategory(),
                    request.getDescription());
            return ResponseEntity.ok(complaint);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping
    public List<Complaint> getAllComplaints() {
        // In real app, check for Admin role
        return complaintService.getAllComplaints();
    }

    @GetMapping("/my/{studentId}")
    public List<Complaint> getMyComplaints(@PathVariable Long studentId) {
        return complaintService.getStudentComplaints(studentId);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        try {
            String statusStr = payload.get("status");
            Complaint.Status status = Complaint.Status.valueOf(statusStr.toUpperCase());
            Complaint complaint = complaintService.updateStatus(id, status);
            return ResponseEntity.ok(complaint);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
