-- Import past email recipients for the most recent announcement
-- This script finds the most recent announcement (post with is_announcement=true)
-- and adds all the provided email addresses to the announcement_email_sent table

-- Step 1: Find the most recent announcement post
DO $$
DECLARE
    latest_post_id UUID;
    user_email TEXT;
    user_uuid UUID;
    emails_to_add TEXT[] := ARRAY[
        'herutab@gmail.com',
        'rubypc6@gmail.com',
        'neomis1998@gmail.com',
        'orkr10@gmail.com',
        'sivan.ke@gmail.com',
        'libat23@gmail.com',
        'davidh.hod2@gmail.com',
        'zevipinnick11@gmail.com',
        'talez9518@gmail.com',
        'morandvora@gmail.com',
        'herut.auto@gmail.com',
        'ddl105095@gmail.com',
        'office@multinet.digital',
        'annatb@gmail.com',
        'yogidkl.ai@gmail.com',
        's0548527514@gmail.com',
        'adiravansa@gmail.com',
        'citrusgd@gmail.com',
        'danielleshitrit4@gmail.com',
        'ytroth123@gmail.com',
        'mariostark@yahoo.com',
        'michalezer34@gmail.com',
        'adaklon@gmail.com',
        'shivuk4ut2@gmail.com',
        'siginaor@gmail.com',
        'nivg10@gmail.com',
        'oritu75@gmail.com',
        'eladshuali@gmail.com',
        'avishay02@live.com',
        'kempler1@gmail.com',
        'talmi.omer@gmail.com',
        'shaidevnet@gmail.com',
        'yeshdrop@gmail.com',
        'eladrato@gmail.com',
        'sbby0548@gmail.com',
        'ronireshet@gmail.com',
        'dorh21@gmail.com',
        'geler.ori@gmail.com',
        'liorbashari13@gmail.com',
        'shir.bs.office@gmail.com',
        'hensalm89@gmail.com',
        'ugur.kellecioglu.uk@gmail.com',
        'arina.kotov@gmail.com',
        'lee.sharabi2003@gmail.com',
        'hirschfeld7767@gmail.com',
        'rubinov25@gmail.com',
        'nhonlineservices@gmail.com',
        'tal.orbach@gmail.com',
        'yacovanany@gmail.com',
        'refael.shira@gmail.com',
        'ere54115@gmail.com',
        'yoanab@gmail.com',
        'or992255@gmail.com',
        'shanizwigen@gmail.com',
        'galshabog123@gmail.com',
        'yehielhamo51@gmail.com',
        'isaacm@gmail.com',
        'diklash7@gmail.com',
        'zonautomations@gmail.com',
        'dorond2105@gmail.com',
        'ori@orimintzmedia.co.il',
        'pazivgi@gmail.com',
        'va.elad@gmail.com',
        'studiolalum@gmail.com',
        'dmiretski@gmail.com',
        'motialp770@gmail.com',
        'guy@g4u-ins.com',
        'ofira@oe-lawfirm.com',
        'a5498016@gmail.com',
        'alona.kreynin@gmail.com',
        'yarivrotem.ai@gmail.com',
        'avitall457@gmail.com',
        'adisher100@gmail.com',
        'ido.meiri23@gmail.com',
        'mathac100@gmail.com',
        'orr.wer@gmail.com',
        'karinasp.office@gmail.com',
        'asaf.epshtain@gmail.com',
        'alexgoldblat@gmail.com',
        'zilberdovi48@gmail.com',
        'michael@megalodon.co.il',
        'golanmarketing81@gmail.com',
        'office@hilahayeila.com',
        'r0533103607@gmail.com',
        'shaharsaadon1@gmail.com',
        'noa.gonen7777@gmail.com',
        'nisimelec77@gmail.com',
        'hi@chachma.co.il',
        'enioimportil@gmail.com',
        'yotvat1@gmail.com',
        'morad812@outlook.com',
        'ugur.kellecioglu@outlook.com',
        'arikalajem@gmail.com',
        'nivkors@gmail.com',
        'odedinka@yahoo.com',
        'erezc83@gmail.com'
    ];
    inserted_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- Find the most recent announcement post
    SELECT id INTO latest_post_id
    FROM posts
    WHERE is_announcement = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF latest_post_id IS NULL THEN
        RAISE EXCEPTION 'No announcement posts found';
    END IF;

    RAISE NOTICE 'Found latest announcement post: %', latest_post_id;

    -- Loop through each email and add to tracking table
    FOREACH user_email IN ARRAY emails_to_add
    LOOP
        -- Find user_id from auth.users by email
        SELECT id INTO user_uuid
        FROM auth.users
        WHERE email = user_email
        LIMIT 1;

        IF user_uuid IS NOT NULL THEN
            -- Check if profile exists for this user
            IF EXISTS (SELECT 1 FROM profiles WHERE user_id = user_uuid) THEN
                -- Insert into tracking table (ignore duplicates)
                INSERT INTO announcement_email_sent (post_id, user_id, sent_at)
                VALUES (latest_post_id, user_uuid, NOW())
                ON CONFLICT (post_id, user_id) DO NOTHING;
                
                IF FOUND THEN
                    inserted_count := inserted_count + 1;
                ELSE
                    skipped_count := skipped_count + 1;
                END IF;
            ELSE
                RAISE NOTICE 'User % has no profile, skipping', user_email;
                skipped_count := skipped_count + 1;
            END IF;
        ELSE
            RAISE NOTICE 'User with email % not found in auth.users', user_email;
            skipped_count := skipped_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE 'Import completed: % inserted, % skipped', inserted_count, skipped_count;
END $$;
