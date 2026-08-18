package com.stiapba.documentmanagement.province;

import java.util.UUID;

public final class ProvinceDtos {
    private ProvinceDtos() {
    }

    public record ProvinceResponse(UUID id, String name) {
    }
}
