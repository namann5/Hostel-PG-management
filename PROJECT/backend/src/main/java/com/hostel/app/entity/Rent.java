package com.hostel.app.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class Rent {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "student_id")
    private Student student;

    private String month;
    private Double amount;
    
    @Enumerated(EnumType.STRING)
    private Status status;
    
    private LocalDateTime paidDate;

    public enum Status {
        PAID, UNPAID, PENDING
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public Double getAmount() { return amount; }
    public void setAmount(Double amount) { this.amount = amount; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getPaidDate() { return paidDate; }
    public void setPaidDate(LocalDateTime paidDate) { this.paidDate = paidDate; }
}
