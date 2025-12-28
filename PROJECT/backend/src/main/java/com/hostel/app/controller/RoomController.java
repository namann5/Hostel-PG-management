package com.hostel.app.controller;

import com.hostel.app.dto.RoomRequest;
import com.hostel.app.entity.Room;
import com.hostel.app.service.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @GetMapping
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@RequestBody RoomRequest request) {
        try {
            Room room = roomService.createRoom(request.getRoomNumber(), request.getTotalBeds());
            return ResponseEntity.ok(room);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
