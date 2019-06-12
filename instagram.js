//清除追蹤
let db;
    try {
      db = await MongoClient.connect(url, { useNewUrlParser: true });
      let collection = await db.db("huninnbot").collection("Followings");
      let logincollection = await db.db("huninnbot").collection("Logins");

      await loadFromDB(logincollection);

      let followings = ig.feed.accountFollowing();
      let followingItems = await followings.items();

      for (const f of followingItems) {
        let result = await collection.findOne({
          user_id: f.pk
        });

        if (result != null && result.check != null) {
          if (result.check > 10 && !f.followed_by) {
            let unfollow = await ig.friendship.destroy(result.user_id);

            let insertresult = await collection.deleteOne({
              user_id: result.user_id
            });

            await sleep(3000);
          } else {
            let insertresult = await collection.updateOne(
              { user_id: result.user_id },
              {
                $set: {
                  check: result.check + 1
                }
              },
              { upsert: true }
            );
          }
        }
      }

      return followingItems;
    } finally {
      db.close();
    }
	
//追蹤粉絲
let db;
    try {
      db = await MongoClient.connect(url, { useNewUrlParser: true });
      // let collectioner = await db.db("huninnbot").collection("Followers");
      let collectioning = await db.db("huninnbot").collection("Followings");
      let logincollection = await db.db("huninnbot").collection("Logins");

      await loadFromDB(logincollection);

      let followers = ig.feed.accountFollowers();
      let followerItems = await followers.items();

      for (const f of followerItems) {
        if (f.is_private) continue;

        // let follow = await ig.friendship.create(f.pk);
        await f.checkFollow();
        // const friendshipStatus = await ig.friendship.show(f.user.pk);
        // if (friendshipStatus.following === true) continue;
        // await ig.friendship.create(f.user.pk);

        let insertresult = await collectioning.updateOne(
          { user_id: f.pk },
          {
            $set: {
              user_id: f.pk,
              check: 1
            }
          },
          { upsert: true }
        );

        await sleep(3000);
      }

      let tagFeed = ig.feed.tag("food");
      let tagItems = await tagFeed.items();
      let commentCnt = 0,
        commentControl = 6;

      for (const item of tagItems) {
        if (commentCnt > commentControl) {
          continue;
        }

        if (item.comments_disabled != null && !item.comments_disabled) {
          continue;
        }

        if (!item.photo_of_you) {
          if (commentCnt % 2 == 0) {
            await ig.media.like({
              mediaId: item.caption.media_id,
              moduleInfo: {
                module_name: "profile",
                user_id: ig.state.cookieUserId,
                username: ig.state.cookieUsername
              },
              d: _.sample([0, 1])
            });
          } else {
            let smileystr = convertUnicode2Char("U+1F60A");
            await ig.media.comment({
              mediaId: item.caption.media_id,
              text: smileystr
            });
          }

          commentCnt++;

          await sleep(3000);
        }
      }

      await self.followUser();

      return followerItems;
    } finally {
      db.close();
    }
	
//追蹤
let tagFeed = ig.feed.tag("美景");
    let tagItems = await tagFeed.items();

    let cnt = 0,
      cntLimit = 5;

    for (const item of tagItems) {
      if (item.user.is_private) continue;

      if (!item.photo_of_you) {
        if (cnt < cntLimit) {
          // await item.checkFollow();
          const friendshipStatus = await ig.friendship.show(item.user.pk);
          if (friendshipStatus.following === true) continue;
          await ig.friendship.create(item.user.pk);

          cnt++;

          let db;
          try {
            db = await MongoClient.connect(url, { useNewUrlParser: true });
            let collection = await db.db("huninnbot").collection("Followings");

            let insertresult = await collection.updateOne(
              { user_id: item.user.pk },
              {
                $set: {
                  // pk: item.user.pk,
                  user_id: item.user.pk,
                  // user_id: item.caption.user_id,
                  //follow: follow,
                  check: 1
                }
              },
              { upsert: true }
            );

            await sleep(3000);
          } finally {
            db.close();
          }
        }
      }
    }
	
//貼文
await sleep(3000);

    let result = jsonData.XML_Head.Infos.Info;

    let postresult = await loopInfos(result);

    let db;
    try {
      db = await MongoClient.connect(url, { useNewUrlParser: true });
      let logincollection = await db.db("huninnbot").collection("Logins");

      await loadFromDB(logincollection);

      let realUrl =
        "https://farm" +
        postresult.farm +
        ".staticflickr.com/" +
        postresult.server +
        "/" +
        postresult.id +
        "_" +
        postresult.secret +
        ".jpg";
      let res = await fetch(realUrl);
      let buffer = await res.buffer();

      let image = await resizeImage(buffer, 80);

      let tags = postresult.tags.tag.map(function(el) {
        return "#" + el._content;
      });

      let options = {
        caption:
          postresult.title._content +
          "\nPhoto Credit: " +
          postresult.owner.realname +
          " @Flickr\n\n\n" +
          tags.join(" "),
        file: image,
        usertags: null,
        location: null
      };

      let detect = await detectImage(buffer);
      if (!detect) {
        let afterpost = await ig.publish.photo(options);
      } else {
        postresult = await self.postImage();
      }
    } catch (err) {
      console.log(err);

      postresult = await self.postImage();
    } finally {
      db.close();
    }

    return postresult;
  }