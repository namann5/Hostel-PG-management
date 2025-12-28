package com.hostel.app.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class Student extends User {
    private String studentId;
    private String department;
    private LocalDate joinDate;
    private boolean active;

    @OneToOne
    @JoinColumn(name = "user_id")
    private User user;

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public LocalDate getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDate joinDate) { this.joinDate = joinDate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
