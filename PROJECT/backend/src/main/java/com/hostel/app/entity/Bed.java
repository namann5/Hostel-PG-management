package com.hostel.app.entity;

import jakarta.persistence.*;

@Entity
public class Bed {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String bedNumber;
    private boolean occupied;

    @ManyToOne
    @JoinColumn(name = "room_id")
    private Room room;

    @OneToOne
    @JoinColumn(name = "student_id")
    private Student student;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }
    public boolean isOccupied() { return occupied; }
    public void setOccupied(boolean occupied) { this.occupied = occupied; }
    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }
    public Student getStudent() { return student; }
    public void setStudent(Student student) { this.student = student; }
}
