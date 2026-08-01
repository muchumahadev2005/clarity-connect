package com.securesend.repository;

import com.securesend.model.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("{ 'email': { $regex: ?0, $options: 'i' }, '_id': { $ne: ?1 } }")
    List<User> searchByEmailExcludingUser(String emailRegex, String excludedUserId, Pageable pageable);
}
