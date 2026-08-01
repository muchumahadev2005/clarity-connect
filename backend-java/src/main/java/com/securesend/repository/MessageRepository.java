package com.securesend.repository;

import com.securesend.model.Message;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MessageRepository extends MongoRepository<Message, String> {

    List<Message> findByReceiverId(String receiverId, Sort sort);

    List<Message> findBySenderId(String senderId, Sort sort);

    long countBySenderIdAndTypeAndCreatedAtGreaterThanEqual(String senderId, String type, Instant createdAt);

    @Query("{ 'expiresAt': { $ne: null, $lte: ?0 } }")
    List<Message> findExpiredMessages(Instant now);

    @Query(value = "{ 'expiresAt': { $ne: null, $lte: ?0 } }", delete = true)
    long deleteExpiredMessages(Instant now);
}
