'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Ticket, TicketComment } from '@/types/ticket';
import { getTicketByIdAction, getTicketCommentsAction, addCommentAction } from '@/lib/actions/ticket-actions';

export default function TicketCommentsPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params?.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      if (!ticketId) return;

      try {
        const [ticketData, commentsData] = await Promise.all([
          getTicketByIdAction(ticketId),
          getTicketCommentsAction(ticketId)
        ]);

        if (!ticketData) {
          router.push('/tickets');
          return;
        }

        setTicket(ticketData);
        setComments(commentsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticketId, router]);

  const addComment = async () => {
    if (!ticket || !newComment.trim()) return;

    setAddingComment(true);
    try {
      const comment = await addCommentAction({
        ticketId: ticket.id!,
        userId: 'current-user-id',
        userName: 'Current User',
        content: newComment
      });

      if (comment) {
        setComments(prev => [comment, ...prev]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มความคิดเห็น');
    } finally {
      setAddingComment(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่พบ Ticket</h1>
          <Button onClick={() => router.push('/tickets')}>
            กลับไปหน้ารายการ Tickets
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="outline" 
          onClick={() => router.push(`/tickets/${ticket.id}`)}
          className="mb-4"
        >
          ← กลับไปหน้ารายละเอียด
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ความคิดเห็น - {ticket.ticketNumber}
          </h1>
          <p className="text-xl text-gray-600">{ticket.subject}</p>
        </div>

        <div className="space-y-6">
          {/* Add Comment Form */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">เพิ่มความคิดเห็น</h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="newComment">ความคิดเห็น</Label>
                <textarea
                  id="newComment"
                  rows={4}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="พิมพ์ความคิดเห็นหรือการอัปเดต..."
                />
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={addComment}
                  disabled={!newComment.trim() || addingComment}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {addingComment ? 'กำลังเพิ่ม...' : 'เพิ่มความคิดเห็น'}
                </Button>
              </div>
            </div>
          </Card>

          {/* Comments List */}
          <Card className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ความคิดเห็นทั้งหมด ({comments.length})
            </h3>
            
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="border-l-4 border-blue-500 pl-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{comment.userName}</h4>
                      <p className="text-sm text-gray-500">{comment.userId}</p>
                    </div>
                    <p className="text-sm text-gray-500">
                      {comment.createdAt && formatDate(comment.createdAt)}
                    </p>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
              
              {comments.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-gray-500 text-lg">ยังไม่มีความคิดเห็น</div>
                  <div className="text-gray-400 text-sm mt-2">
                    เป็นคนแรกที่แสดงความคิดเห็นใน Ticket นี้
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}