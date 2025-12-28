package com.hostel.app.service;

import com.hostel.app.entity.Complaint;
import com.hostel.app.entity.Student;
import com.hostel.app.repository.ComplaintRepository;
import com.hostel.app.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ComplaintService {

    @Autowired
    private ComplaintRepository complaintRepository;

    @Autowired
    private StudentRepository studentRepository;

    public Complaint fileComplaint(Long studentId, String category, String description) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Complaint complaint = new Complaint();
        complaint.setStudent(student);
        complaint.setCategory(category);
        complaint.setDescription(description);
        complaint.setStatus(Complaint.Status.OPEN);

        return complaintRepository.save(complaint);
    }

    public List<Complaint> getAllComplaints() {
        return complaintRepository.findAll();
    }

    public List<Complaint> getStudentComplaints(Long studentId) {
        return complaintRepository.findByStudentId(studentId);
    }

    public Complaint updateStatus(Long id, Complaint.Status status) {
        Complaint complaint = complaintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));
        complaint.setStatus(status);
        return complaintRepository.save(complaint);
    }
}
