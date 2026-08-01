package com.securesend.repository;

import com.securesend.model.Otp;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepository extends MongoRepository<Otp, String> {

    Optional<Otp> findByEmailIgnoreCaseAndOtp(String email, String otp);

    void deleteByEmailIgnoreCase(String email);
}
