package com.hostel.app.controller;

import com.hostel.app.entity.Rent;
import com.hostel.app.service.RentService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rent")
@CrossOrigin(origins = "*")
public class RentController {

    @Autowired
    private RentService rentService;

    @GetMapping("/student/{studentId}")
    public List<Rent> getRentByStudent(@PathVariable Long studentId) {
        return rentService.getRentHistory(studentId);
    }

    @PostMapping("/create")
    public ResponseEntity<?> createRent(@RequestBody Map<String, Object> payload) {
        try {
            Long studentId = Long.valueOf(payload.get("studentId").toString());
            String month = (String) payload.get("month");
            Double amount = Double.valueOf(payload.get("amount").toString());

            Rent rent = rentService.createRent(studentId, month, amount);
            return ResponseEntity.ok(rent);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/pay")
    public ResponseEntity<?> payRent(@PathVariable Long id) {
        try {
            Rent rent = rentService.markAsPaid(id);
            return ResponseEntity.ok(rent);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
