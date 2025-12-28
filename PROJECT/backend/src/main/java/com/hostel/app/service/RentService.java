package com.hostel.app.service;

import com.hostel.app.entity.Rent;
import com.hostel.app.entity.Student;
import com.hostel.app.repository.RentRepository;
import com.hostel.app.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RentService {

    @Autowired
    private RentRepository rentRepository;

    @Autowired
    private StudentRepository studentRepository;

    public List<Rent> getRentHistory(Long studentId) {
        return rentRepository.findByStudentId(studentId);
    }

    public Rent createRent(Long studentId, String month, Double amount) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found"));

        Rent rent = new Rent();
        rent.setStudent(student);
        rent.setMonth(month);
        rent.setAmount(amount);
        rent.setStatus(Rent.Status.PENDING);

        return rentRepository.save(rent);
    }

    public Rent markAsPaid(Long rentId) {
        Rent rent = rentRepository.findById(rentId)
                .orElseThrow(() -> new RuntimeException("Rent record not found"));
        rent.setStatus(Rent.Status.PAID);
        return rentRepository.save(rent);
    }
}
