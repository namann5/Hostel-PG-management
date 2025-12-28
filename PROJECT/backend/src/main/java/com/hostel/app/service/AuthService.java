package com.hostel.app.service;

import com.hostel.app.dto.LoginRequest;
import com.hostel.app.entity.User;
import com.hostel.app.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private com.hostel.app.repository.StudentRepository studentRepository;

    public User login(LoginRequest request) {
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            // In a real app, use BCrypt to check password
            if (user.getPassword().equals(request.getPassword())) {
                return user;
            }
        }
        return null;
    }

    public User register(com.hostel.app.dto.RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword()); // Should encode in real app

        try {
            user.setRole(User.Role.valueOf(request.getRole().toUpperCase()));
        } catch (IllegalArgumentException e) {
            user.setRole(User.Role.STUDENT); // Default to Student
        }

        User savedUser = userRepository.save(user);

        // If Student, create Student profile
        if (savedUser.getRole() == User.Role.STUDENT) {
            com.hostel.app.entity.Student student = new com.hostel.app.entity.Student();
            student.setUser(savedUser);
            student.setJoinDate(java.time.LocalDate.now());
            student.setActive(true);
            studentRepository.save(student);
        }

        return savedUser;
    }
}
