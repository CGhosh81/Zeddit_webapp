import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Post {
  id: number;
  title: string;
  content: string;
  username: string;
  userId: string;
  votes: Array<{ userId: string; value: number }>;
  createdAt: string;
}

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const savedPosts = JSON.parse(localStorage.getItem('posts') || '[]');
    setPosts(savedPosts);
  }, []);

  const handleVote = (postId: number, voteType: 'up' | 'down') => {
    if (!isAuthenticated) {
      toast.error('Please login to vote');
      return;
    }

    const updatedPosts = posts.map(post => {
      if (post.id === postId && user) {
        const voteValue = voteType === 'up' ? 1 : -1;
        const votes = [...post.votes];
        const existingVoteIndex = votes.findIndex(v => v.userId === user.id);

        if (existingVoteIndex !== -1) {
          votes[existingVoteIndex].value = voteValue;
        } else {
          votes.push({ userId: user.id, value: voteValue });
        }

        return { ...post, votes };
      }
      return post;
    });

    setPosts(updatedPosts);
    localStorage.setItem('posts', JSON.stringify(updatedPosts));
  };

  const handleDelete = (postId: number) => {
    const updatedPosts = posts.filter(post => post.id !== postId);
    setPosts(updatedPosts);
    localStorage.setItem('posts', JSON.stringify(updatedPosts));
    toast.success('Post deleted successfully');
  };

  const getVoteCount = (post: Post) => {
    return post.votes.reduce((sum, vote) => sum + vote.value, 0);
  };

  const getUserVote = (post: Post) => {
    if (!user) return 0;
    const userVote = post.votes.find(vote => vote.userId === user.id);
    return userVote ? userVote.value : 0;
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <button
                onClick={() => handleVote(post.id, 'up')}
                className={`p-1 rounded ${
                  getUserVote(post) === 1 ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'
                }`}
              >
                <ArrowUp size={20} />
              </button>
              <span className="text-lg font-semibold">{getVoteCount(post)}</span>
              <button
                onClick={() => handleVote(post.id, 'down')}
                className={`p-1 rounded ${
                  getUserVote(post) === -1 ? 'text-purple-500' : 'text-gray-400 hover:text-purple-500'
                }`}
              >
                <ArrowDown size={20} />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{post.title}</h2>
                {user && post.userId === user.id && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-400 mt-1">
                Posted by {post.username} • {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <p className="mt-4 text-gray-300">{post.content}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}