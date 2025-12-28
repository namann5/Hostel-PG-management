package com.hostel.app.repository;

import com.hostel.app.entity.Rent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RentRepository extends JpaRepository<Rent, Long> {
    List<Rent> findByStudentId(Long studentId);
}
