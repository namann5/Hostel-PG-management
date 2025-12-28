package com.hostel.app.service;

import com.hostel.app.entity.Bed;
import com.hostel.app.entity.Room;
import com.hostel.app.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {

    @Autowired
    private RoomRepository roomRepository;

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room createRoom(String roomNumber, int totalBeds) {
        if (roomRepository.findByRoomNumber(roomNumber).isPresent()) {
            throw new RuntimeException("Room already exists");
        }

        Room room = new Room();
        room.setRoomNumber(roomNumber);

        List<Bed> beds = new ArrayList<>();
        for (int i = 1; i <= totalBeds; i++) {
            Bed bed = new Bed();
            bed.setBedNumber(roomNumber + "-" + (char) ('A' + i - 1)); // 101-A, 101-B
            bed.setRoom(room);
            beds.add(bed);
        }
        room.setBeds(beds);

        return roomRepository.save(room);
    }
}
