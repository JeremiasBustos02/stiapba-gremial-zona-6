package com.stiapba.documentmanagement.user;

import com.stiapba.documentmanagement.user.UserDtos.DelegateResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/delegates")
public class DelegateController {
    private final UserService userService;

    public DelegateController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<DelegateResponse> listActive() {
        return userService.listActiveDelegates();
    }
}
